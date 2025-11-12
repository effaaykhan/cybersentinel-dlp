'use client'

import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Monitor, Circle, Activity, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function AgentsPage() {
  // Fetch agents from API
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAgents,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch agent stats
  const { data: agentStats } = useQuery({
    queryKey: ['agent-stats'],
    queryFn: api.getAgentsSummary,
    refetchInterval: 30000,
  })

  const stats = {
    total: agentStats?.total || 0,
    online: agentStats?.online || 0,
    offline: agentStats?.offline || 0,
    warning: agentStats?.warning || 0,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-900/30 border-green-500/50'
      case 'offline': return 'text-red-400 bg-red-900/30 border-red-500/50'
      case 'warning': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50'
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'offline': return <AlertCircle className="w-4 h-4" />
      case 'warning': return <Activity className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Endpoint Agents</h1>
          <p className="text-gray-400 mt-2">Manage and monitor DLP agents deployed across your organization</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Agents</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
              </div>
              <Monitor className="w-12 h-12 text-indigo-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{stats.online}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Offline</p>
                <p className="text-3xl font-bold text-red-400 mt-2">{stats.offline}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Warnings</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.warning}</p>
              </div>
              <Activity className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Deployed Agents</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Monitor className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Agents Found</h3>
              <p className="text-gray-400">Agents will appear here once they register with the server</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operating System</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Seen</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {agents.map((agent: any) => (
                    <tr key={agent.agent_id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-white font-medium">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{agent.os}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300 font-mono text-sm">{agent.ip_address}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-medium uppercase ${getStatusColor(agent.status)}`}>
                          {getStatusIcon(agent.status)}
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                        {agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-400 font-mono text-xs">{agent.version}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
