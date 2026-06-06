import React, { useState } from 'react'
import { Card, Space, Button, Form, Input, message, Tabs, Upload, Alert } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { MetaEarthSDK } from 'meta-earth-js-sdk'

interface ContractPanelProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const ContractPanel: React.FC<ContractPanelProps> = ({ sdk, isInitialized, addLog }) => {
  const [storeCodeForm] = Form.useForm()
  const [deployForm] = Form.useForm()
  const [executeForm] = Form.useForm()
  const [queryForm] = Form.useForm()
  const [wasmFile, setWasmFile] = useState<Uint8Array | null>(null)
  const [wasmFileName, setWasmFileName] = useState<string>('')
  const [wasmHash, setWasmHash] = useState<string>('')
  const [existingCodeId, setExistingCodeId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCheckingHash, setIsCheckingHash] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)

  // Calculate the SHA256 hash
  const calculateHash = async (data: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      const wasmBytes = new Uint8Array(arrayBuffer)
      setWasmFile(wasmBytes)
      setWasmFileName(file.name)
      setExistingCodeId(null)

      // Calculate the hash
      const hash = await calculateHash(arrayBuffer)
      setWasmHash(hash)

      addLog(`Loaded ${file.name}`)
      addLog(`  Size: ${wasmBytes.length} bytes`)
      addLog(`  SHA256: ${hash.toUpperCase()}`)
      message.success(`Loaded ${file.name}`)

      // Automatically check whether a code_id with the same hash already exists
      if (isInitialized) {
        setIsCheckingHash(true)
        addLog(`Checking whether this code already exists on-chain...`)
        try {
          const codeId = await sdk.contract.getCodeIdByHash(hash)
          if (codeId) {
            setExistingCodeId(codeId)
            addLog(`Found existing code_id: ${codeId}`)
            message.info(
              `Found existing Code ID ${codeId}. You can instantiate the contract directly`,
            )
          } else {
            addLog(`No matching code found. Store the code first`)
          }
        } catch (error: any) {
          addLog(`Failed to check existing code: ${error.message}`)
        } finally {
          setIsCheckingHash(false)
        }
      }
    }
    reader.onerror = () => {
      message.error('File read failed')
    }
    reader.readAsArrayBuffer(file)
    return false // Prevent automatic upload
  }

  // Store code (MsgStoreCode)
  const handleStoreCode = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    if (!wasmFile) {
      message.error('Please select or load a WASM file first')
      return
    }

    try {
      const values = await storeCodeForm.validateFields()
      setIsUploading(true)
      addLog('Storing contract code on-chain...')
      addLog(`  Sender: ${values.sender}`)
      addLog(`  File: ${wasmFileName}`)
      addLog(`  Size: ${wasmFile.length} bytes`)

      try {
        const result = await sdk.contract.storeCode({
          sender: values.sender,
          wasmByteCode: wasmFile,
          layer: 'wasm',
        })

        addLog(`Code stored successfully`)
        addLog(`  Result: ${result}`)

        // Try to parse the returned codeId
        try {
          const parsed = JSON.parse(result)
          if (parsed.tx_bytes) {
            addLog(`  Transaction bytes ready for broadcast`)
          }
        } catch {}

        message.success('Contract code stored successfully')
      } catch (error: any) {
        addLog(`Store code failed: ${error.message}`)
        message.error('Store code failed')
      }
    } catch (error: any) {
      message.error('Please fill in all required fields')
    } finally {
      setIsUploading(false)
    }
  }

  // Instantiate contract (MsgInstantiateContract)
  const handleDeploy = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await deployForm.validateFields()
      addLog('Instantiating contract...')
      addLog(`  Code ID: ${values.codeId}`)
      addLog(`  Label: ${values.label}`)
      if (values.admin) {
        addLog(`  Admin: ${values.admin}`)
      }

      try {
        const result = await sdk.contract.deployContract({
          codeId: Number(values.codeId),
          initMsg: values.initMsg ? JSON.parse(values.initMsg) : {},
          label: values.label,
          admin: values.admin || undefined,
          layer: 'wasm',
        })

        addLog(`Contract instantiated successfully`)
        addLog(`  Result: ${result}`)
        message.success('Contract instantiated successfully!')
      } catch (error: any) {
        addLog(`Instantiation failed: ${error.message}`)
        message.error('Instantiation failed')
      }
    } catch (error: any) {
      message.error('Please complete the deployment form')
    }
  }

  // Execute contract (MsgExecuteContract)
  const handleExecute = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await executeForm.validateFields()
      addLog('Executing contract...')
      addLog(`  Contract: ${values.contractAddress}`)
      addLog(`  Sender: ${values.sender}`)
      addLog(`  Message: ${values.msg}`)

      // Parse funds
      let funds: any[] = []
      if (values.funds) {
        try {
          funds = JSON.parse(values.funds)
          addLog(`  Funds: ${JSON.stringify(funds)}`)
        } catch {
          message.error('Attached funds JSON is invalid')
          return
        }
      }

      try {
        const result = await sdk.contract.executeContract({
          contractAddress: values.contractAddress,
          msg: JSON.parse(values.msg),
          sender: values.sender,
          funds,
          layer: 'wasm',
        })

        addLog(`Contract executed successfully`)
        addLog(`  Result: ${result}`)
        message.success('Contract executed successfully!')
      } catch (error: any) {
        addLog(`Execution failed: ${error.message}`)
        message.error('Execution failed')
      }
    } catch (error: any) {
      message.error('Please complete the execution form')
    }
  }

  // Query contract list by Code ID
  const handleQueryByCodeId = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await queryForm.validateFields(['queryCodeId'])
      const codeId = Number(values.queryCodeId)
      setIsQuerying(true)
      addLog(`Loading contracts by Code ID: ${codeId}...`)

      try {
        const result = await sdk.contract.getContractsByCodeId(codeId)
        addLog(`Query successful`)
        addLog(`  Found ${result.contracts?.length || 0} contracts:`)
        if (result.contracts && result.contracts.length > 0) {
          result.contracts.forEach((addr: string, index: number) => {
            addLog(`    ${index + 1}. ${addr}`)
          })
        } else {
          addLog(`  No contracts found for Code ID: ${codeId}`)
        }
        message.success(`Found ${result.contracts?.length || 0} contracts`)
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please enter a Code ID')
    } finally {
      setIsQuerying(false)
    }
  }

  // Query contract list by creator address
  const handleQueryByCreator = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await queryForm.validateFields(['creatorAddress'])
      const creatorAddress = values.creatorAddress
      setIsQuerying(true)
      addLog(`Loading contracts by creator: ${creatorAddress}...`)

      try {
        const result = await sdk.contract.getContractsByCreator(creatorAddress)
        addLog(`Query successful`)
        addLog(`  Found ${result.contract_addresses?.length || 0} contracts:`)
        if (result.contract_addresses && result.contract_addresses.length > 0) {
          result.contract_addresses.forEach((addr: string, index: number) => {
            addLog(`    ${index + 1}. ${addr}`)
          })
        } else {
          addLog(`  No contracts found for creator: ${creatorAddress}`)
        }
        message.success(`Found ${result.contract_addresses?.length || 0} contracts`)
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please enter a creator address')
    } finally {
      setIsQuerying(false)
    }
  }

  // Query contract state (Smart Query)
  const handleQueryContractSmart = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await queryForm.validateFields(['smartQueryAddress', 'smartQueryData'])
      const contractAddress = values.smartQueryAddress
      let queryData: any

      try {
        queryData = JSON.parse(values.smartQueryData)
      } catch {
        message.error('Query data JSON is invalid')
        return
      }

      setIsQuerying(true)
      addLog(`Running smart query...`)
      addLog(`  Contract: ${contractAddress}`)
      addLog(`  Query: ${JSON.stringify(queryData)}`)

      try {
        const result = await sdk.contract.queryContractSmart(contractAddress, queryData)
        addLog(`Query successful`)
        addLog(`  Result: ${JSON.stringify(result.data, null, 2)}`)
        message.success('Query successful')
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please complete the query form')
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <Card title="WASM Contracts" className="demo-section">
      <Alert
        message="Contract Workflow"
        description="1. Store code (MsgStoreCode) to get a Code ID. 2. Instantiate the contract (MsgInstantiateContract) to get a contract address. 3. Execute the contract (MsgExecuteContract)."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Tabs
        items={[
          {
            key: 'storeCode',
            label: '1. Store Code',
            children: (
              <Form form={storeCodeForm} layout="vertical">
                <Form.Item label="WASM File">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Upload accept=".wasm" showUploadList={false} beforeUpload={handleFileUpload}>
                      <Button icon={<UploadOutlined />}>Select WASM File</Button>
                    </Upload>
                    {wasmFileName && (
                      <Alert
                        message={`Selected file: ${wasmFileName}`}
                        description={
                          <div style={{ fontSize: 12 }}>
                            <div>Size: {wasmFile?.length || 0} bytes</div>
                            <div style={{ wordBreak: 'break-all' }}>
                              SHA256: {wasmHash.toUpperCase()}
                            </div>
                            {isCheckingHash && (
                              <div>Checking whether the code already exists on-chain...</div>
                            )}
                            {existingCodeId && (
                              <div style={{ color: '#1890ff', fontWeight: 'bold' }}>
                                Existing Code ID found on-chain: {existingCodeId}
                              </div>
                            )}
                          </div>
                        }
                        type={existingCodeId ? 'info' : 'success'}
                        showIcon
                      />
                    )}
                  </Space>
                </Form.Item>
                <Form.Item name="sender" label="Sender Address" rules={[{ required: true }]}>
                  <Input placeholder="me1..." />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleStoreCode}
                    loading={isUploading}
                    disabled={!wasmFile}
                    style={{ width: '100%' }}
                  >
                    Store Code (MsgStoreCode)
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'deploy',
            label: '2. Instantiate',
            children: (
              <Form form={deployForm} layout="vertical">
                <Form.Item name="codeId" label="Code ID" rules={[{ required: true }]}>
                  <Input placeholder="Code ID from the previous step" type="number" />
                </Form.Item>
                <Form.Item
                  name="label"
                  label="Contract Label (optional)"
                  initialValue={`My Candy Contract`}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="My Candy Contract" />
                </Form.Item>
                <Form.Item name="admin" label="Admin Address (optional)">
                  <Input placeholder="me1... (leave empty for no admin)" />
                </Form.Item>
                <Form.Item
                  name="initMsg"
                  label="Instantiation Message (JSON)"
                  initialValue={`{"admin":"me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj","referees":["me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj"],"config":{"fixed_min_total":"1000","fixed_max_total":"1000000000","fixed_min_count":1,"fixed_max_count":10000,"fixed_min_amount_per_user":"1","fixed_max_amount_per_user":"100000000","random_min_total":"1000","random_max_total":"1000000000","random_min_count":2,"random_max_count":10000,"random_min_amount_per_user":"1","default_expire_time":86400,"default_claim_delay_time":0}}`}
                  rules={[{ required: true }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder='{"admin":"me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj","referees":["me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj"],"config":{"fixed_min_total":"1000","fixed_max_total":"1000000000","fixed_min_count":1,"fixed_max_count":10000,"fixed_min_amount_per_user":"1","fixed_max_amount_per_user":"100000000","random_min_total":"1000","random_max_total":"1000000000","random_min_count":2,"random_max_count":10000,"random_min_amount_per_user":"1","default_expire_time":86400,"default_claim_delay_time":0}}'
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleDeploy} style={{ width: '100%' }}>
                    Instantiate (MsgInstantiateContract)
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'execute',
            label: '3. Execute',
            children: (
              <Form form={executeForm} layout="vertical">
                <Form.Item
                  name="contractAddress"
                  label="Contract Address"
                  initialValue={`me1xnl29l92rt8y76fqvukz8al373h4ld3wwn58g6m0tazgwzgcp7mqjaypfn`}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="me1... (returned from the instantiate step)" />
                </Form.Item>
                <Form.Item
                  name="sender"
                  label="Sender Address"
                  initialValue={`me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj`}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="me1..." />
                </Form.Item>
                {/* 
                  Create candy
                  {"create_candy":{"candy_type":"Fixed","total_amount":"10000000","total_count":10,"participant_merkle_root":null,"claim_period":[1764828420,1767420420]}}
                  Claim candy
                  {"claim_candy":{"candy_id":1,"proof":null,"claims":[{"address":"me1pp7gf6l8qhf7l3s252cm937rpzauctg6rzddft","bytecode_offset":null,"coin":{"denom":"umec","amount":"1000000"}},{"address":"me1ec50cpu4rwwpr2thku5hrhksxvkcdah3y95ehj","bytecode_offset":null,"coin":{"denom":"umec","amount":"1000000"}}]}}
                */}
                <Form.Item
                  name="msg"
                  label="Execution Message (JSON)"
                  rules={[{ required: true }]}
                  initialValue={`{"create_candy":{"candy_type":"Fixed","total_amount":"10000000","total_count":10,"participant_merkle_root":null,"claim_period":[1764828420,1767420420]}}`}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder='{"create_candy":{"candy_type":"Fixed","total_amount":"10000000","total_count":10,"participant_merkle_root":null,"claim_period":[1764828420,1767420420]}}'
                  />
                </Form.Item>
                <Form.Item
                  name="funds"
                  label="Funds (JSON, optional; should equal total_amount)"
                  initialValue={`[{"denom": "umec", "amount": "10000000"}]`}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder='[{"denom": "umec", "amount": "10000000"}]'
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleExecute} style={{ width: '100%' }}>
                    Execute (MsgExecuteContract)
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'query',
            label: '4. Query',
            children: (
              <Form form={queryForm} layout="vertical">
                <Form.Item name="queryCodeId" label="Contracts by Code ID">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="Enter a Code ID"
                      type="number"
                      style={{ width: 'calc(100% - 100px)' }}
                    />
                    <Button type="primary" onClick={handleQueryByCodeId} loading={isQuerying}>
                      Query
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Form.Item name="creatorAddress" label="Contracts by Creator">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input placeholder="me1..." style={{ width: 'calc(100% - 100px)' }} />
                    <Button type="primary" onClick={handleQueryByCreator} loading={isQuerying}>
                      Query
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Alert
                  message="Smart Query: Contract State"
                  type="info"
                  style={{ marginTop: 16, marginBottom: 16 }}
                />
                <Form.Item
                  name="smartQueryAddress"
                  label="Contract Address"
                  initialValue="me1xnl29l92rt8y76fqvukz8al373h4ld3wwn58g6m0tazgwzgcp7mqjaypfn"
                >
                  <Input placeholder="me1..." />
                </Form.Item>
                <Form.Item
                  name="smartQueryData"
                  label="Query Data (JSON)"
                  initialValue='{"candy":{"candy_id":1}}'
                  extra={'Example: {"candy":{"candy_id":1}}'}
                >
                  <Input.TextArea rows={3} placeholder='{"candy":{"candy_id":1}}' />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleQueryContractSmart}
                    loading={isQuerying}
                    style={{ width: '100%' }}
                  >
                    Run Smart Query
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </Card>
  )
}
