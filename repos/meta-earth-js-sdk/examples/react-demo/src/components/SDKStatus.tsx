import React from 'react'
import { Card, Descriptions, Tag } from 'antd'
import { MetaEarthSDK } from 'meta-earth-js-sdk'

interface SDKStatusProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
}

export const SDKStatus: React.FC<SDKStatusProps> = ({ sdk, isInitialized }) => {
  const environment = sdk.getEnvironment()
  const version = sdk.getVersion()
  const network = sdk.getCurrentNetwork()

  return (
    <Card title="SDK Status" className="demo-section">
      <Descriptions bordered column={2}>
        <Descriptions.Item label="SDK Version">
          <Tag color="blue">{version}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Environment">
          <Tag color={environment === 'browser' ? 'green' : 'orange'}>{environment}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={isInitialized ? 'success' : 'default'}>
            {isInitialized ? 'Ready' : 'Not initialized'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Current Network">
          <Tag color={network === 'mainnet' ? 'red' : 'blue'}>{network}</Tag>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
