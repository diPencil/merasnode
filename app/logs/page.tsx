"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Activity, User, Monitor, Globe, Filter, X } from "lucide-react"

interface Log {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  } | null
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [entityFilter, setEntityFilter] = useState<string>("all")

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, entityFilter])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      let url = '/api/logs?limit=100'

      if (actionFilter !== "all") {
        url += `&action=${actionFilter}`
      }
      if (entityFilter !== "all") {
        url += `&entityType=${entityFilter}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setActionFilter("all")
    setEntityFilter("all")
  }

  const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all"

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'UPDATE': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'DELETE': return 'bg-red-500/10 text-red-700 dark:text-red-400'
      case 'LOGIN': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <AppLayout title="Activity Logs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Track all system activities and user actions</p>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{logs.length} activities</span>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="Contact">Contact</SelectItem>
                    <SelectItem value="Conversation">Conversation</SelectItem>
                    <SelectItem value="Message">Message</SelectItem>
                    <SelectItem value="Template">Template</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and user actions with detailed metadata</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading activity logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">No activity logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="border-border/30">
                        <TableCell>
                          <Badge className={`rounded - full ${getActionColor(log.action)} `}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.entityType}</span>
                            {log.entityId && (
                              <span className="text-xs text-muted-foreground">ID: {log.entityId.slice(0, 8)}...</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{log.metadata?.userName || log.user?.name || 'System'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.metadata?.description || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col text-xs">
                              <span>{log.metadata?.device || 'Unknown'}</span>
                              <span className="text-muted-foreground">{log.metadata?.browser || 'Unknown'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{log.ipAddress || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span>{format(new Date(log.createdAt), "MMM dd, yyyy")}</span>
                            <span className="text-muted-foreground">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
