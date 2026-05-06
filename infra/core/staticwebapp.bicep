param name string
param location string
param tags object
param sku string = 'Free'

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    provider: 'Custom'
  }
}

output id string = swa.id
output name string = swa.name
output hostname string = swa.properties.defaultHostname
output uri string = 'https://${swa.properties.defaultHostname}'
