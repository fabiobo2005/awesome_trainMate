[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$Repository,

  [Parameter(Mandatory = $false)]
  [string]$GitHubBranch = "main",

  [Parameter(Mandatory = $false)]
  [string]$NamePrefix = "trainmate",

  [Parameter(Mandatory = $false)]
  [string]$Environment = "dev",

  [Parameter(Mandatory = $false)]
  [string]$TenantId,

  [Parameter(Mandatory = $false)]
  [string]$FrontendSubscriptionId,

  [Parameter(Mandatory = $false)]
  [string]$BackendSubscriptionId,

  [Parameter(Mandatory = $false)]
  [string]$DataAiSubscriptionId,

  [Parameter(Mandatory = $false)]
  [string]$AcrName,

  [Parameter(Mandatory = $false)]
  [string]$SwaName,

  [Parameter(Mandatory = $false)]
  [string]$FrontendApiBaseUrl = "https://api.trainmate.local",

  [Parameter(Mandatory = $false)]
  [switch]$SkipRoleAssignments,

  [Parameter(Mandatory = $false)]
  [switch]$SkipGitHubVariables,

  [Parameter(Mandatory = $false)]
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "==> $Message"
}

function As-Array {
  param([Parameter(Mandatory = $false)]$InputObject)
  if ($null -eq $InputObject) {
    return @()
  }
  if ($InputObject -is [System.Array]) {
    return $InputObject
  }
  return @($InputObject)
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Invoke-AzJson {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $fullArguments = @()
  $fullArguments += $Arguments
  if ($fullArguments -notcontains "--only-show-errors") {
    $fullArguments += "--only-show-errors"
  }
  if (($fullArguments -notcontains "--output") -and ($fullArguments -notcontains "-o")) {
    $fullArguments += "--output"
    $fullArguments += "json"
  }

  $raw = & az @fullArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($fullArguments -join ' ')"
  }

  $text = ($raw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Invoke-Gh {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  & gh @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI command failed: gh $($Arguments -join ' ')"
  }
}

function Get-TfvarsDefaults {
  param([Parameter(Mandatory = $true)][string]$Path)
  $defaults = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $defaults
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }
    if ($trimmed -match '^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"') {
      $defaults[$matches[1]] = $matches[2]
    }
  }
  return $defaults
}

function Resolve-RepositorySlug {
  param([Parameter(Mandatory = $false)][string]$ExplicitRepository)
  if (-not [string]::IsNullOrWhiteSpace($ExplicitRepository)) {
    return $ExplicitRepository
  }

  $originUrl = (& git config --get remote.origin.url 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($originUrl)) {
    throw "Could not detect repository from git remote. Pass -Repository <owner/repo>."
  }

  $pattern = 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(?:\.git)?$'
  if ($originUrl -match $pattern) {
    return "$($matches.owner)/$($matches.repo)"
  }

  throw "Could not parse GitHub repository slug from remote '$originUrl'. Pass -Repository <owner/repo>."
}

function Resolve-RequiredValue {
  param(
    [Parameter(Mandatory = $false)][AllowNull()][AllowEmptyString()][string]$CurrentValue,
    [Parameter(Mandatory = $false)][AllowNull()][AllowEmptyString()][string]$DefaultValue,
    [Parameter(Mandatory = $true)][string]$FieldName
  )

  if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
    return $CurrentValue
  }
  if (-not [string]::IsNullOrWhiteSpace($DefaultValue)) {
    return $DefaultValue
  }
  throw "Missing required value for '$FieldName'. Pass it as a parameter."
}

function Ensure-SubscriptionAccess {
  param(
    [Parameter(Mandatory = $true)][string]$SubscriptionId,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if ($DryRun) {
    Write-Host "[dry-run] Validate subscription access: $Label ($SubscriptionId)"
    return
  }

  $info = Invoke-AzJson @("account", "show", "--subscription", $SubscriptionId)
  Write-Host "Using $Label subscription: $($info.name) ($SubscriptionId)"
}

function Resolve-SingleResourceName {
  param(
    [Parameter(Mandatory = $true)][string]$SubscriptionId,
    [Parameter(Mandatory = $true)][string]$ResourceGroup,
    [Parameter(Mandatory = $true)][string]$ResourceType,
    [Parameter(Mandatory = $true)][string]$FriendlyName,
    [Parameter(Mandatory = $false)][string]$ExplicitName
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitName)) {
    return $ExplicitName
  }

  if ($DryRun) {
    return "dryrun-$FriendlyName"
  }

  $resources = As-Array (Invoke-AzJson @(
      "resource", "list",
      "--subscription", $SubscriptionId,
      "--resource-group", $ResourceGroup,
      "--resource-type", $ResourceType
    ))

  if ($resources.Count -eq 0) {
    throw "No $FriendlyName found in resource group '$ResourceGroup' (subscription $SubscriptionId). Pass it explicitly."
  }
  if ($resources.Count -gt 1) {
    $names = ($resources | ForEach-Object { $_.name }) -join ", "
    throw "Multiple $FriendlyName resources found in '$ResourceGroup': $names. Pass the expected value explicitly."
  }

  return $resources[0].name
}

function Ensure-AppRegistration {
  param([Parameter(Mandatory = $true)][string]$DisplayName)

  if ($DryRun) {
    Write-Host "[dry-run] Ensure app registration '$DisplayName'"
    return [PSCustomObject]@{
      displayName = $DisplayName
      appId       = "dryrun-$DisplayName"
      id          = "dryrun-object-$DisplayName"
    }
  }

  $matches = As-Array (Invoke-AzJson @("ad", "app", "list", "--display-name", $DisplayName))
  if ($matches.Count -gt 0) {
    Write-Host "Reusing existing app registration: $DisplayName"
    return $matches[0]
  }

  Write-Host "Creating app registration: $DisplayName"
  return Invoke-AzJson @("ad", "app", "create", "--display-name", $DisplayName, "--sign-in-audience", "AzureADMyOrg")
}

function Ensure-ServicePrincipalObjectId {
  param(
    [Parameter(Mandatory = $true)][string]$AppId,
    [Parameter(Mandatory = $true)][string]$DisplayName
  )

  if ($DryRun) {
    Write-Host "[dry-run] Ensure service principal for '$DisplayName' ($AppId)"
    return "dryrun-sp-$DisplayName"
  }

  $servicePrincipal = $null
  try {
    $servicePrincipal = Invoke-AzJson @("ad", "sp", "show", "--id", $AppId)
  }
  catch {
    $servicePrincipal = $null
  }

  if ($null -eq $servicePrincipal) {
    Write-Host "Creating service principal for '$DisplayName'"
    $servicePrincipal = Invoke-AzJson @("ad", "sp", "create", "--id", $AppId)
  }
  else {
    Write-Host "Reusing existing service principal for '$DisplayName'"
  }

  return $servicePrincipal.id
}

function Ensure-FederatedCredential {
  param(
    [Parameter(Mandatory = $true)][string]$AppId,
    [Parameter(Mandatory = $true)][string]$CredentialName,
    [Parameter(Mandatory = $true)][string]$RepositorySlug,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if ($DryRun) {
    Write-Host "[dry-run] Ensure federated credential '$CredentialName' for app '$AppId'"
    return
  }

  $credentials = As-Array (Invoke-AzJson @("ad", "app", "federated-credential", "list", "--id", $AppId))
  $existing = $credentials | Where-Object { $_.name -eq $CredentialName }
  if ($existing) {
    Write-Host "Reusing federated credential '$CredentialName' on app '$AppId'"
    return
  }

  $payload = @{
    name        = $CredentialName
    issuer      = "https://token.actions.githubusercontent.com/"
    subject     = "repo:$RepositorySlug:ref:refs/heads/$Branch"
    description = $Description
    audiences   = @("api://AzureADTokenExchange")
  }

  $tmpFile = New-TemporaryFile
  try {
    $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $tmpFile.FullName -Encoding utf8
    Write-Host "Creating federated credential '$CredentialName' on app '$AppId'"
    Invoke-AzJson @(
      "ad", "app", "federated-credential", "create",
      "--id", $AppId,
      "--parameters", $tmpFile.FullName
    ) | Out-Null
  }
  finally {
    Remove-Item -LiteralPath $tmpFile.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-RoleAssignment {
  param(
    [Parameter(Mandatory = $true)][string]$PrincipalObjectId,
    [Parameter(Mandatory = $true)][string]$RoleName,
    [Parameter(Mandatory = $true)][string]$Scope,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if ($SkipRoleAssignments) {
    Write-Host "Skipping RBAC assignment for $Label because -SkipRoleAssignments was set."
    return
  }

  if ($DryRun) {
    Write-Host "[dry-run] Ensure role '$RoleName' on '$Scope' for $Label"
    return
  }

  $existing = As-Array (Invoke-AzJson @(
      "role", "assignment", "list",
      "--assignee-object-id", $PrincipalObjectId,
      "--scope", $Scope,
      "--role", $RoleName
    ))

  if ($existing.Count -gt 0) {
    Write-Host "Reusing existing role assignment '$RoleName' for $Label on $Scope"
    return
  }

  Write-Host "Creating role assignment '$RoleName' for $Label on $Scope"
  Invoke-AzJson @(
    "role", "assignment", "create",
    "--assignee-object-id", $PrincipalObjectId,
    "--assignee-principal-type", "ServicePrincipal",
    "--role", $RoleName,
    "--scope", $Scope
  ) | Out-Null
}

function Set-GitHubVariable {
  param(
    [Parameter(Mandatory = $true)][string]$Repo,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )

  if ($SkipGitHubVariables) {
    Write-Host "Skipping GitHub variable '$Name' because -SkipGitHubVariables was set."
    return
  }

  if ($DryRun) {
    Write-Host "[dry-run] gh variable set $Name --repo $Repo --body ***"
    return
  }

  Invoke-Gh @("variable", "set", $Name, "--repo", $Repo, "--body", $Value)
}

Write-Step "Checking prerequisites"
Require-Command "az"
Require-Command "gh"
Require-Command "git"

if (-not $DryRun) {
  $null = Invoke-AzJson @("account", "show")
  & gh auth status | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run 'gh auth login' and try again."
  }
}

$repoSlug = Resolve-RepositorySlug -ExplicitRepository $Repository
Write-Host "Target GitHub repository: $repoSlug"

$tfvarsPath = Join-Path $PSScriptRoot "..\..\infra\envs\dev\terraform.tfvars.example"
$tfvarsDefaults = Get-TfvarsDefaults -Path $tfvarsPath

$TenantId = Resolve-RequiredValue -CurrentValue $TenantId -DefaultValue ($tfvarsDefaults["tenant_id"]) -FieldName "TenantId"
$FrontendSubscriptionId = Resolve-RequiredValue -CurrentValue $FrontendSubscriptionId -DefaultValue ($tfvarsDefaults["subscription_frontend"]) -FieldName "FrontendSubscriptionId"
$BackendSubscriptionId = Resolve-RequiredValue -CurrentValue $BackendSubscriptionId -DefaultValue ($tfvarsDefaults["subscription_backend"]) -FieldName "BackendSubscriptionId"
$DataAiSubscriptionId = Resolve-RequiredValue -CurrentValue $DataAiSubscriptionId -DefaultValue ($tfvarsDefaults["subscription_data_ai"]) -FieldName "DataAiSubscriptionId"

$frontendResourceGroup = "rg-$NamePrefix-$Environment-frontend"
$backendResourceGroup = "rg-$NamePrefix-$Environment-backend"
$dataAiResourceGroup = "rg-$NamePrefix-$Environment-data-ai"
$apiContainerGroup = "$NamePrefix-$Environment-api-cg"
$aiContainerGroup = "$NamePrefix-$Environment-ai-cg"

Write-Step "Validating subscription access"
Ensure-SubscriptionAccess -SubscriptionId $FrontendSubscriptionId -Label "frontend"
Ensure-SubscriptionAccess -SubscriptionId $BackendSubscriptionId -Label "backend"
Ensure-SubscriptionAccess -SubscriptionId $DataAiSubscriptionId -Label "data-ai"

Write-Step "Resolving Azure resource names"
$AcrName = Resolve-SingleResourceName -SubscriptionId $BackendSubscriptionId -ResourceGroup $backendResourceGroup -ResourceType "Microsoft.ContainerRegistry/registries" -FriendlyName "ACR" -ExplicitName $AcrName
$SwaName = Resolve-SingleResourceName -SubscriptionId $FrontendSubscriptionId -ResourceGroup $frontendResourceGroup -ResourceType "Microsoft.Web/staticSites" -FriendlyName "Static Web App" -ExplicitName $SwaName

$appBase = "$NamePrefix-$Environment-github-cd"
$safeBranch = ($GitHubBranch.ToLowerInvariant() -replace "[^a-z0-9-]", "-")

Write-Step "Ensuring Entra app registrations and service principals"
$frontendApp = Ensure-AppRegistration -DisplayName "$appBase-frontend"
$backendApp = Ensure-AppRegistration -DisplayName "$appBase-backend"
$dataAiApp = Ensure-AppRegistration -DisplayName "$appBase-data-ai"

$frontendSpObjectId = Ensure-ServicePrincipalObjectId -AppId $frontendApp.appId -DisplayName $frontendApp.displayName
$backendSpObjectId = Ensure-ServicePrincipalObjectId -AppId $backendApp.appId -DisplayName $backendApp.displayName
$dataAiSpObjectId = Ensure-ServicePrincipalObjectId -AppId $dataAiApp.appId -DisplayName $dataAiApp.displayName

Write-Step "Ensuring GitHub OIDC federated credentials"
Ensure-FederatedCredential -AppId $frontendApp.appId -CredentialName "gh-$safeBranch-frontend" -RepositorySlug $repoSlug -Branch $GitHubBranch -Description "GitHub Actions OIDC for frontend tier"
Ensure-FederatedCredential -AppId $backendApp.appId -CredentialName "gh-$safeBranch-backend" -RepositorySlug $repoSlug -Branch $GitHubBranch -Description "GitHub Actions OIDC for backend tier"
Ensure-FederatedCredential -AppId $dataAiApp.appId -CredentialName "gh-$safeBranch-data-ai" -RepositorySlug $repoSlug -Branch $GitHubBranch -Description "GitHub Actions OIDC for data-ai tier"

Write-Step "Ensuring RBAC role assignments"
$backendRgScope = "/subscriptions/$BackendSubscriptionId/resourceGroups/$backendResourceGroup"
$dataAiRgScope = "/subscriptions/$DataAiSubscriptionId/resourceGroups/$dataAiResourceGroup"
$frontendRgScope = "/subscriptions/$FrontendSubscriptionId/resourceGroups/$frontendResourceGroup"
$acrScope = "/subscriptions/$BackendSubscriptionId/resourceGroups/$backendResourceGroup/providers/Microsoft.ContainerRegistry/registries/$AcrName"

Ensure-RoleAssignment -PrincipalObjectId $backendSpObjectId -RoleName "AcrPush" -Scope $acrScope -Label "backend app ($($backendApp.appId))"
Ensure-RoleAssignment -PrincipalObjectId $backendSpObjectId -RoleName "Contributor" -Scope $backendRgScope -Label "backend app ($($backendApp.appId))"
Ensure-RoleAssignment -PrincipalObjectId $dataAiSpObjectId -RoleName "Contributor" -Scope $dataAiRgScope -Label "data-ai app ($($dataAiApp.appId))"
Ensure-RoleAssignment -PrincipalObjectId $frontendSpObjectId -RoleName "Contributor" -Scope $frontendRgScope -Label "frontend app ($($frontendApp.appId))"

Write-Step "Setting GitHub Actions repository variables"
$repositoryVariables = [ordered]@{
  AZURE_TENANT_ID                 = $TenantId
  AZURE_CLIENT_ID_FRONTEND        = $frontendApp.appId
  AZURE_SUBSCRIPTION_ID_FRONTEND  = $FrontendSubscriptionId
  AZURE_CLIENT_ID_BACKEND         = $backendApp.appId
  AZURE_SUBSCRIPTION_ID_BACKEND   = $BackendSubscriptionId
  AZURE_CLIENT_ID_DATA_AI         = $dataAiApp.appId
  AZURE_SUBSCRIPTION_ID_DATA_AI   = $DataAiSubscriptionId
  ACR_NAME                        = $AcrName
  ACI_API_RESOURCE_GROUP          = $backendResourceGroup
  ACI_API_CONTAINER_GROUP         = $apiContainerGroup
  ACI_AI_RESOURCE_GROUP           = $dataAiResourceGroup
  ACI_AI_CONTAINER_GROUP          = $aiContainerGroup
  SWA_RESOURCE_GROUP              = $frontendResourceGroup
  SWA_NAME                        = $SwaName
  FRONTEND_API_BASE_URL           = $FrontendApiBaseUrl
}

foreach ($entry in $repositoryVariables.GetEnumerator()) {
  Set-GitHubVariable -Repo $repoSlug -Name $entry.Key -Value ([string]$entry.Value)
}

Write-Host ""
Write-Host "Bootstrap finished."
Write-Host ""
Write-Host "App registrations:"
@(
  [PSCustomObject]@{ Tier = "frontend"; DisplayName = $frontendApp.displayName; ClientId = $frontendApp.appId }
  [PSCustomObject]@{ Tier = "backend"; DisplayName = $backendApp.displayName; ClientId = $backendApp.appId }
  [PSCustomObject]@{ Tier = "data-ai"; DisplayName = $dataAiApp.displayName; ClientId = $dataAiApp.appId }
) | Format-Table -AutoSize

Write-Host ""
Write-Host "Repository variables configured:"
$repositoryVariables.GetEnumerator() | ForEach-Object {
  [PSCustomObject]@{
    Name  = $_.Key
    Value = $_.Value
  }
} | Format-Table -AutoSize
