param name string
param location string
param tags object
@description('Principal IDs to grant AcrPull')
param pullPrincipalIds array = []

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acrPullAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for principalId in pullPrincipalIds: if (!empty(principalId)) {
  name: guid(registry.id, principalId, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}]

output id string = registry.id
output name string = registry.name
output loginServer string = registry.properties.loginServer
