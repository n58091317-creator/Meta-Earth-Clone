import React, { useState } from 'react'
import { Card, Space, Button, Form, Input, Select, message, Tabs } from 'antd'
import type { MetaEarthSDK } from 'meta-earth-js-sdk'

interface StakingPanelProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const StakingPanel: React.FC<StakingPanelProps> = ({ sdk, isInitialized, addLog }) => {
  const [stakeForm] = Form.useForm()
  const [unstakeForm] = Form.useForm()
  const [claimForm] = Form.useForm()

  const handleStake = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await stakeForm.validateFields()
      const denom = values.denom || 'umec'
      addLog('Submitting staking transaction...')
      addLog(`  Address: ${values.address}`)
      addLog(`  Amount: ${values.amount} ${denom}`)

      try {
        const txHash = await sdk.staking.stakeFlexible({
          address: values.address,
          amount: { amount: values.amount, denom },
        })

        addLog(`Staking successful. Transaction hash: ${txHash}`)
        message.success('Stake successful!')
        stakeForm.resetFields()
      } catch (error: any) {
        addLog(`Staking failed: ${error.message}`)
        message.error('Stake failed')
      }
    } catch (error: any) {
      message.error('Please complete the staking form')
    }
  }

  const handleUnstake = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await unstakeForm.validateFields()
      const denom = values.denom || 'umec'
      addLog('Submitting unstake transaction...')
      addLog(`  Address: ${values.address}`)
      addLog(`  Amount: ${values.amount} ${denom}`)

      try {
        const txHash = await sdk.staking.unstakeFlexible({
          address: values.address,
          amount: { amount: values.amount, denom },
        })

        addLog(`Unstaking successful. Transaction hash: ${txHash}`)
        message.success('Unstake successful!')
        unstakeForm.resetFields()
      } catch (error: any) {
        addLog(`Unstaking failed: ${error.message}`)
        message.error('Unstake failed')
      }
    } catch (error: any) {
      message.error('Please complete the unstake form')
    }
  }

  const handleClaim = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await claimForm.validateFields()
      addLog(`Claiming staking rewards for ${values.address}...`)

      try {
        const txHash = await sdk.staking.claimStakingReward(values.address)
        addLog(`Claim successful. Transaction hash: ${txHash}`)
        message.success('Claim successful!')
      } catch (error: any) {
        addLog(`Claim failed: ${error.message}`)
        message.error('Claim failed')
      }
    } catch (error: any) {
      message.error('Please enter a valid address')
    }
  }

  const [queryForm] = Form.useForm()
  const [rewardForm] = Form.useForm()

  const handleQueryFlexible = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }
    try {
      const values = await queryForm.validateFields()
      addLog(`Loading flexible staking position for ${values.address}...`)
      try {
        const result = await sdk.staking.getFlexibleDelegation(values.address)
        addLog(`Query result: ${JSON.stringify(result, null, 2)}`)
        message.success('Query successful')
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please enter a valid address')
    }
  }

  const handleQueryRewards = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }
    try {
      const values = await rewardForm.validateFields()
      addLog(`Loading staking rewards for ${values.address}...`)
      try {
        const result = await sdk.staking.getFlexibleDelegationRewards(values.address)
        addLog(`Query result: ${JSON.stringify(result, null, 2)}`)
        message.success('Query successful')
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please enter a valid address')
    }
  }

  return (
    <Card title="Staking" className="demo-section">
      <Tabs
        items={[
          {
            key: 'stake',
            label: 'Stake',
            children: (
              <Form form={stakeForm} layout="vertical">
                <Form.Item name="address" label="Wallet Address" rules={[{ required: true }]}>
                  <Input placeholder="metaearth1..." />
                </Form.Item>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input placeholder="1000" />
                </Form.Item>
                <Form.Item
                  name="denom"
                  label="Token Denom"
                  rules={[{ required: true }]}
                  initialValue={`umec`}
                >
                  <Input placeholder="umec" />
                </Form.Item>
                <Form.Item name="validatorAddress" label="Validator Address (optional)">
                  <Input placeholder="metaearthvaloper1..." />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleStake} style={{ width: '100%' }}>
                    Stake
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'unstake',
            label: 'Unstake',
            children: (
              <Form form={unstakeForm} layout="vertical">
                <Form.Item name="address" label="Wallet Address" rules={[{ required: true }]}>
                  <Input placeholder="metaearth1..." />
                </Form.Item>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input placeholder="1000" />
                </Form.Item>
                <Form.Item name="denom" label="Token Denom" rules={[{ required: true }]}>
                  <Input placeholder="uatom" />
                </Form.Item>
                <Form.Item name="validatorAddress" label="Validator Address (optional)">
                  <Input placeholder="metaearthvaloper1..." />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleUnstake} style={{ width: '100%' }}>
                    Unstake
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'claim',
            label: 'Claim Rewards',
            children: (
              <Form form={claimForm} layout="vertical">
                <Form.Item name="address" label="Wallet Address" rules={[{ required: true }]}>
                  <Input placeholder="metaearth1..." />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleClaim} style={{ width: '100%' }}>
                    Claim Rewards
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'query',
            label: 'Lookup',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title="Flexible Staking Position">
                  <Form form={queryForm} layout="vertical">
                    <Form.Item name="address" label="Wallet Address" rules={[{ required: true }]}>
                      <Input placeholder="metaearth1..." />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        onClick={handleQueryFlexible}
                        style={{ width: '100%' }}
                      >
                        View Position
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
                <Card size="small" title="Staking Rewards">
                  <Form form={rewardForm} layout="vertical">
                    <Form.Item name="address" label="Wallet Address" rules={[{ required: true }]}>
                      <Input placeholder="metaearth1..." />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" onClick={handleQueryRewards} style={{ width: '100%' }}>
                        View Rewards
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
