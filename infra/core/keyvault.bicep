param name string
param location string
param tags object
@description('Object IDs (user / SP) to grant Key Vault Secrets Officer (RBAC)')
param adminPrincipalIds array = []
@description('Object IDs (typically Container App identities) to grant Key Vault Secrets User (read)')
param readerPrincipalIds array = []

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

var secretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource adminAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for pid in adminPrincipalIds: if (!empty(pid)) {
  name: guid(vault.id, pid, secretsOfficerRoleId)
  scope: vault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsOfficerRoleId)
    principalId: pid
  }
}]

resource readerAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for pid in readerPrincipalIds: if (!empty(pid)) {
  name: guid(vault.id, pid, secretsUserRoleId)
  scope: vault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
    principalId: pid
    principalType: 'ServicePrincipal'
  }
}]

output id string = vault.id
output name string = vault.name
output endpoint string = vault.properties.vaultUri
