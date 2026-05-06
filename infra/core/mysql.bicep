param name string
param location string
param tags object
param administratorLogin string
@secure()
param administratorLoginPassword string
param databaseName string = 'trainmate'
param skuName string = 'Standard_B1ms'
param tier string = 'Burstable'
param storageSizeGB int = 32
param mysqlVersion string = '8.0.21'

resource mysql 'Microsoft.DBforMySQL/flexibleServers@2023-12-30' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: tier
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: mysqlVersion
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource allowAzure 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2023-12-30' = {
  parent: mysql
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource db 'Microsoft.DBforMySQL/flexibleServers/databases@2023-12-30' = {
  parent: mysql
  name: databaseName
  dependsOn: [ allowAzure ]
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

output id string = mysql.id
output name string = mysql.name
output fqdn string = mysql.properties.fullyQualifiedDomainName
output databaseName string = db.name
