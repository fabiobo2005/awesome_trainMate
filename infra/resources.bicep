param location string
param tags object
param abbrs object
param resourceToken string
param environmentName string
param principalId string
param mysqlAdministratorLogin string
@secure()
param mysqlAdministratorPassword string
@secure()
param jwtSecret string
@description('Set to "true" to run prisma db seed on container start. Use only on first deploy or when reseeding.')
param runDbSeed string = 'false'

var apiPort = 8080
var aiPort = 8090

module monitoring 'core/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}trainmate-${environmentName}-${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}trainmate-${environmentName}-${resourceToken}'
  }
}

module registry 'core/registry.bicep' = {
  name: 'registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}trainmate${environmentName}${resourceToken}'
    location: location
    tags: tags
  }
}

module mysql 'core/mysql.bicep' = {
  name: 'mysql'
  params: {
    name: '${abbrs.dbForMySqlFlexibleServers}trainmate-${environmentName}-${resourceToken}'
    location: location
    tags: tags
    administratorLogin: mysqlAdministratorLogin
    administratorLoginPassword: mysqlAdministratorPassword
  }
}

var databaseUrl = 'mysql://${mysqlAdministratorLogin}:${uriComponent(mysqlAdministratorPassword)}@${mysql.outputs.fqdn}:3306/${mysql.outputs.databaseName}?sslaccept=accept_invalid_certs'

module cae 'core/containerapps-environment.bicep' = {
  name: 'cae'
  params: {
    name: '${abbrs.appManagedEnvironments}trainmate-${environmentName}-${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

module aiApp 'core/containerapp.bicep' = {
  name: 'ai-app'
  params: {
    name: '${abbrs.appContainerApps}ai-${environmentName}-${resourceToken}'
    location: location
    tags: tags
    serviceName: 'ai'
    identityName: '${abbrs.managedIdentityUserAssignedIdentities}ai-${environmentName}-${resourceToken}'
    containerAppsEnvironmentId: cae.outputs.id
    containerRegistryName: registry.outputs.name
    targetPort: aiPort
    external: true
    minReplicas: 0
    maxReplicas: 2
    env: [
      { name: 'PORT', value: string(aiPort) }
    ]
  }
}

module apiApp 'core/containerapp.bicep' = {
  name: 'api-app'
  params: {
    name: '${abbrs.appContainerApps}api-${environmentName}-${resourceToken}'
    location: location
    tags: tags
    serviceName: 'api'
    identityName: '${abbrs.managedIdentityUserAssignedIdentities}api-${environmentName}-${resourceToken}'
    containerAppsEnvironmentId: cae.outputs.id
    containerRegistryName: registry.outputs.name
    targetPort: apiPort
    external: true
    minReplicas: 1
    maxReplicas: 1
    cpu: '0.5'
    memory: '1Gi'
    secrets: [
      { name: 'database-url', value: databaseUrl }
      { name: 'jwt-secret', value: jwtSecret }
    ]
    env: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'PORT', value: string(apiPort) }
      { name: 'LOG_LEVEL', value: 'info' }
      { name: 'DATABASE_URL', secretRef: 'database-url' }
      { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
      { name: 'AI_SERVICE_BASE_URL', value: aiApp.outputs.uri }
      { name: 'CORS_ORIGINS', value: 'https://${web.outputs.hostname},https://*.azurestaticapps.net,http://localhost:5173' }
      { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: monitoring.outputs.applicationInsightsConnectionString }
      { name: 'RUN_DB_SEED', value: runDbSeed }
    ]
  }
}

module keyvault 'core/keyvault.bicep' = {
  name: 'kv'
  params: {
    name: take('${abbrs.keyVaultVaults}tm${environmentName}${resourceToken}', 24)
    location: location
    tags: tags
    adminPrincipalIds: empty(principalId) ? [] : [ principalId ]
    readerPrincipalIds: [
      apiApp.outputs.identityPrincipalId
    ]
  }
}

module web 'core/staticwebapp.bicep' = {
  name: 'web'
  params: {
    name: '${abbrs.staticWebApp}trainmate-${environmentName}-${resourceToken}'
    location: 'eastus2'
    tags: tags
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = registry.outputs.name
output AZURE_KEY_VAULT_NAME string = keyvault.outputs.name
output AZURE_KEY_VAULT_ENDPOINT string = keyvault.outputs.endpoint
output AZURE_API_NAME string = apiApp.outputs.name
output AZURE_API_BASE_URL string = apiApp.outputs.uri
output AZURE_AI_NAME string = aiApp.outputs.name
output AZURE_AI_BASE_URL string = aiApp.outputs.uri
output AZURE_WEB_NAME string = web.outputs.name
output AZURE_WEB_HOSTNAME string = web.outputs.hostname
output AZURE_MYSQL_HOSTNAME string = mysql.outputs.fqdn
output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
