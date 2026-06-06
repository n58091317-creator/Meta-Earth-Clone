import React, { useState, useEffect } from 'react'
import { Layout, Button, Space, message, Collapse, Card } from 'antd'
import { MetaEarthSDK } from 'meta-earth-js-sdk'
import { SDKStatus } from './components/SDKStatus'
import { LogPanel } from './components/LogPanel'
import { WalletManager } from './components/WalletManager'
import { QueryPanel } from './components/QueryPanel'
import { TransactionPanel } from './components/TransactionPanel'
import { StakingPanel } from './components/StakingPanel'
import { GovernancePanel } from './components/GovernancePanel'
import { ContractPanel } from './components/ContractPanel'
import './App.css'

const { Header, Content } = Layout

const sdk = new MetaEarthSDK({
  config: {
    network: 'testnet',
    debug: true,
  },
})

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    addLog('Welcome to Meta Earth JS SDK React Demo')
    addLog(`Environment: ${sdk.getEnvironment()}`)
    addLog(`SDK Version: ${sdk.getVersion()}`)
    addLog('Click "Initialize SDK" button to start')
    addLog('---\n')

    setTimeout(() => {
      handleInitialize()
    }, 1000)
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setLogs((prev) => [...prev, logEntry])
  }

  const handleInitialize = async () => {
    try {
      addLog('Initializing SDK...')
      await sdk.initialize()
      setIsInitialized(true)
      addLog('SDK initialized successfully!')
      message.success('SDK initialized successfully')
    } catch (error: any) {
      addLog(`SDK initialization failed: ${error.message}`)
      message.error(`Initialization failed: ${error.message}`)
    }
  }

  const handleSetNetwork = (network: 'testnet' | 'mainnet') => {
    try {
      sdk.setNetwork(network)
      addLog(`Network switched to: ${network}`)
      message.success(`Switched to ${network}`)
    } catch (error: any) {
      addLog(`Network switch failed: ${error.message}`)
      message.error(`Switch failed: ${error.message}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog('Logs cleared')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header
        style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <div className="logo">Meta Earth JS SDK Demo</div>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* SDK Control Panel */}
          <Card title="Control Panel" className="demo-section">
            <Space wrap>
              <Button
                type="primary"
                size="large"
                onClick={handleInitialize}
                disabled={isInitialized}
              >
                Initialize SDK
              </Button>

              <Button onClick={() => handleSetNetwork('testnet')} disabled={!isInitialized}>
                Switch to Testnet
              </Button>

              <Button onClick={() => handleSetNetwork('mainnet')} disabled={!isInitialized}>
                Switch to Mainnet
              </Button>

              <Button onClick={() => addLog(`SDK Version: ${sdk.getVersion()}`)}>
                Show Version
              </Button>
            </Space>
          </Card>

          {/* SDK Status */}
          <SDKStatus sdk={sdk} isInitialized={isInitialized} />

          {/* Collapse panel organizing functional modules */}
          <Collapse
            defaultActiveKey={['wallet', 'contract']}
            style={{ background: 'white' }}
            items={[
              {
                key: 'wallet',
                label: 'Wallet Management',
                children: <WalletManager sdk={sdk} isInitialized={isInitialized} addLog={addLog} />,
              },
              {
                key: 'query',
                label: 'Queries',
                children: <QueryPanel sdk={sdk} isInitialized={isInitialized} addLog={addLog} />,
              },
              {
                key: 'transaction',
                label: 'Transfer',
                children: (
                  <TransactionPanel sdk={sdk} isInitialized={isInitialized} addLog={addLog} />
                ),
              },
              {
                key: 'staking',
                label: 'Staking',
                children: <StakingPanel sdk={sdk} isInitialized={isInitialized} addLog={addLog} />,
              },
              {
                key: 'governance',
                label: 'Governance',
                children: (
                  <GovernancePanel sdk={sdk} isInitialized={isInitialized} addLog={addLog} />
                ),
              },
              {
                key: 'contract',
                label: 'Contracts',
                children: <ContractPanel sdk={sdk} isInitialized={isInitialized} addLog={addLog} />,
              },
            ]}
          />

          {/* Log Panel */}
          <LogPanel logs={logs} onClear={clearLogs} />
        </Space>
      </Content>
    </Layout>
  )
}

export default App
