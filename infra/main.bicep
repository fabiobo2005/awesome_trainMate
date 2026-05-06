targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Object ID of the user that will be granted Key Vault admin')
param principalId string = ''

@description('MySQL administrator username')
param mysqlAdministratorLogin string = 'trainmateadmin'

@description('MySQL administrator password (sensitive). Generated if not provided.')
@secure()
param mysqlAdministratorPassword string = newGuid()

@description('JWT signing secret used by the API')
@secure()
param jwtSecret string = newGuid()

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  project: 'trainmate'
  environment: environmentName
  managed_by: 'azd'
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: '${abbrs.resourcesResourceGroups}trainmate-${environmentName}'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    tags: tags
    abbrs: abbrs
    resourceToken: resourceToken
    environmentName: environmentName
    principalId: principalId
    mysqlAdministratorLogin: mysqlAdministratorLogin
    mysqlAdministratorPassword: mysqlAdministratorPassword
    jwtSecret: jwtSecret
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.AZURE_CONTAINER_REGISTRY_NAME
output AZURE_KEY_VAULT_NAME string = resources.outputs.AZURE_KEY_VAULT_NAME
output AZURE_KEY_VAULT_ENDPOINT string = resources.outputs.AZURE_KEY_VAULT_ENDPOINT
output AZURE_API_NAME string = resources.outputs.AZURE_API_NAME
output AZURE_API_BASE_URL string = resources.outputs.AZURE_API_BASE_URL
output AZURE_AI_NAME string = resources.outputs.AZURE_AI_NAME
output AZURE_AI_BASE_URL string = resources.outputs.AZURE_AI_BASE_URL
output AZURE_WEB_NAME string = resources.outputs.AZURE_WEB_NAME
output AZURE_WEB_HOSTNAME string = resources.outputs.AZURE_WEB_HOSTNAME
output AZURE_MYSQL_HOSTNAME string = resources.outputs.AZURE_MYSQL_HOSTNAME
output APPLICATIONINSIGHTS_CONNECTION_STRING string = resources.outputs.APPLICATIONINSIGHTS_CONNECTION_STRING
