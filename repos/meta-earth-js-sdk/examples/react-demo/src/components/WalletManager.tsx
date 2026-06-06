import React, { useEffect, useState } from 'react'
import { Card, Button, Input, Space, message, List, Typography, Modal, Form, Tabs } from 'antd'
import type { MetaEarthSDK } from 'meta-earth-js-sdk'

interface WalletManagerProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const WalletManager: React.FC<WalletManagerProps> = ({ sdk, isInitialized, addLog }) => {
  const [walletAddresses, setWalletAddresses] = useState<string[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privateKey'>('privateKey')
  const [form] = Form.useForm()
  const [convertForm] = Form.useForm()

  const handleCreateWallet = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      addLog('Creating mnemonic wallet...')
      const result = await sdk.wallet.createMnemonicWallet()
      addLog(`Wallet created successfully. Address: ${result.address}`)
      addLog(`Mnemonic: ${result.mnemonic}`)
      message.success('Wallet created successfully!')

      setWalletAddresses((prev) => [...prev, result.address])
    } catch (error: any) {
      addLog(`Wallet creation failed: ${error.message}`)
      message.error(`Creation failed: ${error.message}`)
    }
  }

  const handleImportWallet = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }
    setModalVisible(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const walletData: any = {}

      if (activeTab === 'mnemonic' && values.mnemonic) {
        walletData.mnemonic = values.mnemonic
      } else if (activeTab === 'privateKey' && values.privateKey) {
        walletData.privateKey = values.privateKey
      }

      if (Object.keys(walletData).length === 0) {
        message.error('Please enter a mnemonic or private key')
        return
      }

      addLog('Importing wallet...')
      const result = await sdk.wallet.importWallet(walletData)
      addLog(`Wallet imported successfully. Address: ${result.address}`)
      message.success('Wallet imported successfully!')

      setWalletAddresses((prev) => [...prev, result.address])
      setModalVisible(false)
      form.resetFields()
    } catch (error: any) {
      addLog(`Wallet import failed: ${error.message}`)
      message.error(`Import failed: ${error.message}`)
    }
  }

  const handleModalCancel = () => {
    setModalVisible(false)
    form.resetFields()
  }

  const handleAddressConversion = () => {
    setConvertModalVisible(true)
  }

  const handleConvertModalOk = async () => {
    try {
      const values = await convertForm.validateFields()
      const address = values.address.trim()

      let resultAddress = ''
      let logMsg = ''

      if (address.startsWith('0x')) {
        // 0x -> me
        resultAddress = sdk.wallet.convert0xToMeAddress(address)
        logMsg = `Address conversion (0x -> ME): ${address} -> ${resultAddress}`
      } else {
        // me -> 0x
        resultAddress = sdk.wallet.convertMeTo0xAddress(address)
        logMsg = `Address conversion (ME -> 0x): ${address} -> ${resultAddress}`
      }

      addLog(logMsg)
      message.success(`Conversion successful: ${resultAddress}`)
      setConvertModalVisible(false)
      convertForm.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      addLog(`Address conversion failed: ${error.message}`)
      message.error('Address conversion failed')
    }
  }

  const handleConvertModalCancel = () => {
    setConvertModalVisible(false)
    convertForm.resetFields()
  }

  const handleGetAddresses = () => {
    const addresses = sdk.wallet.getWalletAddresses()
    setWalletAddresses(addresses)
    addLog(`Current wallet count: ${addresses.length}`)
    if (addresses.length > 0) {
      addresses.forEach((addr, i) => addLog(`  ${i + 1}. ${addr}`))
    }
  }

  const handleBatchCreateWallets = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    const count = 5 // Create five wallets in a batch
    try {
      addLog(`Starting batch creation of ${count} wallets...`)
      const wallets = []

      for (let i = 0; i < count; i++) {
        const result = await sdk.wallet.createMnemonicWallet()
        wallets.push(result)
        addLog(`  [${i + 1}/${count}] ${result.address}`)
        setWalletAddresses((prev) => [...prev, result.address])
      }

      addLog(`Batch creation completed. Created ${count} wallets`)
      message.success(`Successfully created ${count} wallets!`)
    } catch (error: any) {
      addLog(`Batch creation failed: ${error.message}`)
      message.error(`Batch creation failed: ${error.message}`)
    }
  }

  const handleExportWallet = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const addresses = sdk.wallet.getWalletAddresses()
      if (addresses.length === 0) {
        message.warning('No wallets available to export')
        return
      }

      addLog('Exporting wallet info...')
      addLog(`Total ${addresses.length} wallet addresses:`)
      addresses.forEach((address, index) => {
        addLog(`  ${index + 1}. ${address}`)
      })
      message.success('Wallet addresses have been added to the log')
    } catch (error: any) {
      addLog(`Wallet export failed: ${error.message}`)
      message.error(`Export failed: ${error.message}`)
    }
  }

  return (
    <Card title="Wallet Management" className="demo-section">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Button type="primary" onClick={handleCreateWallet}>
            Create Wallet
          </Button>
          <Button onClick={handleBatchCreateWallets}>Create 5 Wallets</Button>
          <Button onClick={handleImportWallet}>Import Wallet</Button>
          <Button onClick={handleGetAddresses}>Refresh Addresses</Button>
          <Button onClick={handleExportWallet}>Export Addresses</Button>
          <Button onClick={handleAddressConversion}>Convert Address</Button>
        </Space>

        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>Wallet Addresses</div>
          {walletAddresses.length === 0 ? (
            <div style={{ color: 'rgba(0, 0, 0, 0.25)', textAlign: 'center' }}>No wallets yet</div>
          ) : (
            walletAddresses.map((address, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 0',
                  borderBottom: index < walletAddresses.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <Typography.Text>
                  {index + 1}. {address}
                </Typography.Text>
              </div>
            ))
          )}
        </div>
      </Space>

      <Modal
        title="Import Wallet"
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'mnemonic' | 'privateKey')}
            items={[
              {
                key: 'mnemonic',
                label: 'Mnemonic',
                children: (
                  <Form.Item
                    name="mnemonic"
                    label="Mnemonic"
                    rules={[
                      {
                        required: activeTab === 'mnemonic',
                        message: 'Please enter a mnemonic',
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder="Enter a 12- or 24-word mnemonic separated by spaces"
                    />
                  </Form.Item>
                ),
              },
              {
                key: 'privateKey',
                label: 'Private Key',
                children: (
                  <Form.Item
                    name="privateKey"
                    label="Private Key"
                    initialValue={`2b522b5191b5ed1420abfdc860146aecbe086f4397179aac28acbc9ab7eff5c7`}
                    rules={[
                      {
                        required: activeTab === 'privateKey',
                        message: 'Please enter a private key',
                      },
                    ]}
                  >
                    <Input placeholder="Enter a private key" />
                  </Form.Item>
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      <Modal
        title="Address Conversion"
        open={convertModalVisible}
        onOk={handleConvertModalOk}
        onCancel={handleConvertModalCancel}
      >
        <Form form={convertForm} layout="vertical">
          <Form.Item
            name="address"
            label="Address (0x or me)"
            rules={[{ required: true, message: 'Please enter an address' }]}
          >
            <Input placeholder="0x... or me..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
