import React, { useState } from 'react'
import { Card, Space, Button, Form, Input, Select, message, Tabs } from 'antd'
import { MetaEarthSDK, ProposalStatus } from 'meta-earth-js-sdk'

interface GovernancePanelProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const GovernancePanel: React.FC<GovernancePanelProps> = ({ sdk, isInitialized, addLog }) => {
  const [proposalForm] = Form.useForm()
  const [voteForm] = Form.useForm()

  const handleSubmitProposal = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await proposalForm.validateFields()
      addLog('Submitting software upgrade proposal...')
      addLog(`Title: ${values.title}`)

      // Parse plan JSON
      let plan
      try {
        plan = values.plan ? JSON.parse(values.plan) : undefined
      } catch (e) {
        message.error('Upgrade plan JSON is invalid')
        return
      }

      if (!plan || !plan.name || !plan.height) {
        message.error('The upgrade plan must include name and height fields')
        return
      }

      try {
        const txHash = await sdk.governance.submitSoftwareUpgradeProposal({
          proposer: values.proposer,
          content: {
            title: values.title,
            description: values.description,
            plan,
          },
          initialDeposit: [
            {
              denom: values.denom || 'umec',
              amount: values.deposit || '100000000',
            },
          ],
        })

        addLog(`Proposal submitted successfully. Transaction hash: ${txHash}`)
        message.success('Proposal submitted successfully!')
        proposalForm.resetFields()
      } catch (error: any) {
        addLog(`Proposal submission failed: ${error.message}`)
        message.error(`Proposal submission failed: ${error.message}`)
      }
    } catch (error: any) {
      message.error('Please complete the proposal form')
    }
  }

  const handleVote = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await voteForm.validateFields()
      addLog(`Casting vote on proposal #${values.proposalId}`)

      try {
        const txHash = await sdk.governance.voteProposal({
          proposalId: values.proposalId,
          voter: values.voter,
          option: values.option,
        })

        addLog(`Vote successful. Transaction hash: ${txHash}`)
        message.success('Vote successful!')
        voteForm.resetFields()
      } catch (error: any) {
        addLog(`Vote failed: ${error.message}`)
        message.error('Vote failed')
      }
    } catch (error: any) {
      message.error('Please complete the voting form')
    }
  }

  const [queryV1Form] = Form.useForm()

  const handleQueryProposalsV1 = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }
    try {
      const values = await queryV1Form.validateFields()
      addLog(`Loading proposals (V1): ${values.status || 'All'}...`)
      try {
        const result = await sdk.governance.getProposals(values.status)
        addLog(`Found ${result.length} proposals`)
        result.forEach((p: any, i) => addLog(`${i + 1}. [${p.status}] ${p.title}`))
        message.success(`Found ${result.length} proposals`)
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      // ignore validation error
    }
  }

  return (
    <Card title="Governance" className="demo-section">
      <Tabs
        items={[
          {
            key: 'proposal',
            label: 'Software Upgrade Proposal',
            children: (
              <Form form={proposalForm} layout="vertical">
                <Form.Item name="proposer" label="Proposer Address" rules={[{ required: true }]}>
                  <Input placeholder="mec1..." />
                </Form.Item>
                <Form.Item name="title" label="Proposal Title" rules={[{ required: true }]}>
                  <Input placeholder="Software Upgrade v2.0.0" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Proposal Description"
                  rules={[{ required: true }]}
                >
                  <Input.TextArea rows={4} placeholder="This upgrade includes..." />
                </Form.Item>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item
                    name="deposit"
                    label="Initial Deposit"
                    rules={[{ required: true }]}
                    style={{ flex: 1 }}
                    initialValue="100000000"
                  >
                    <Input placeholder="100000000" />
                  </Form.Item>
                  <Form.Item name="denom" label="Denom" initialValue="umec" style={{ flex: 1 }}>
                    <Input placeholder="umec" />
                  </Form.Item>
                </Space.Compact>
                <Form.Item
                  name="plan"
                  label="Upgrade Plan (JSON)"
                  rules={[{ required: true, message: 'Upgrade plan is required' }]}
                  initialValue={`{"name":"v2.0.13.patch.2","height":"9990811","info":"Upgrade details"}`}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder={
                      '{\n  "name": "v2.0.0",\n  "height": 1000000,\n  "info": "Upgrade details"\n}'
                    }
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleSubmitProposal} style={{ width: '100%' }}>
                    Submit Proposal
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'vote',
            label: 'Cast Vote',
            children: (
              <Form form={voteForm} layout="vertical">
                <Form.Item name="proposalId" label="Proposal ID" rules={[{ required: true }]}>
                  <Input placeholder="1" />
                </Form.Item>
                <Form.Item name="voter" label="Voter Address" rules={[{ required: true }]}>
                  <Input placeholder="metaearth1..." />
                </Form.Item>
                <Form.Item name="option" label="Voting Option" rules={[{ required: true }]}>
                  <Select placeholder="Select a voting option">
                    <Select.Option value="yes">Yes</Select.Option>
                    <Select.Option value="no">No</Select.Option>
                    <Select.Option value="no_with_veto">No with Veto</Select.Option>
                    <Select.Option value="abstain">Abstain</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleVote} style={{ width: '100%' }}>
                    Vote
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'query_v1',
            label: 'View Proposals',
            children: (
              <Form form={queryV1Form} layout="vertical">
                <Form.Item name="status" label="Proposal Status">
                  <Select placeholder="Select a status (optional)" allowClear>
                    {Object.values(ProposalStatus).map((status) => (
                      <Select.Option key={status} value={status}>
                        {status}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleQueryProposalsV1} style={{ width: '100%' }}>
                    Load Proposals
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
