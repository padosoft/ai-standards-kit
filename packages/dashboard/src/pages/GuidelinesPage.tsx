import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Tag,
  ToggleLeft,
  ToggleRight,
  FileJson,
  HardDrive,
  Package,
  AlertCircle,
  Info,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import type { Guideline, GuidelineSource } from '@/types'

const SOURCE_CONFIG: Record<GuidelineSource, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  db: {
    label: 'Database',
    icon: HardDrive,
    color: 'text-blue-500',
    description: 'User-created, changes persist across restarts',
  },
  builtin: {
    label: 'Built-in',
    icon: Package,
    color: 'text-purple-500',
    description: 'Default system rules, read-only',
  },
  standards: {
    label: 'Standards JSON',
    icon: FileJson,
    color: 'text-orange-500',
    description: 'Loaded from settings.json, resynced on server restart',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  behavior: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  quality: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  performance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  testing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  logging: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  database: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export function GuidelinesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<GuidelineSource | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')

  const { data: guidelines, isLoading } = useQuery({
    queryKey: ['guidelines'],
    queryFn: () => api.getGuidelines(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteGuideline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guidelines'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateGuideline(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guidelines'] })
    },
  })

  const filteredGuidelines = guidelines?.filter((g) => {
    // Source filter
    if (sourceFilter !== 'all') {
      const gSource = g.source || 'builtin'
      if (gSource !== sourceFilter) return false
    }
    // Category filter
    if (categoryFilter !== 'all') {
      if (g.category !== categoryFilter) return false
    }
    // Tag filter
    if (tagFilter !== 'all') {
      if (!g.tags?.includes(tagFilter)) return false
    }
    // Text search
    const text = g.content || g.description || ''
    return search
      ? text.toLowerCase().includes(search.toLowerCase()) ||
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      : true
  })

  const activeCount = guidelines?.filter((g) => g.enabled !== false).length ?? 0

  // Count by source
  const sourceCounts = guidelines?.reduce((acc, g) => {
    const source = g.source || 'builtin'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  // Count by category
  const categoryCounts = guidelines?.reduce((acc, g) => {
    const cat = g.category || 'general'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  // Get unique categories from data
  const uniqueCategories = [...new Set(guidelines?.map((g) => g.category || 'general') ?? [])]

  // Count by tag and get unique tags
  const tagCounts = guidelines?.reduce((acc, g) => {
    g.tags?.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>) ?? {}

  const uniqueTags = [...new Set(guidelines?.flatMap((g) => g.tags || []) ?? [])]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Guidelines</h1>
          <p className="text-muted-foreground">Manage AI behavior guidelines</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{activeCount} Active</Badge>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guideline
          </Button>
        </div>
      </div>

      {/* Source Legend */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Guidelines are loaded from multiple sources. Only <strong>Database</strong> guidelines can be modified and persist changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {(Object.entries(SOURCE_CONFIG) as [GuidelineSource, typeof SOURCE_CONFIG[GuidelineSource]][]).map(([source, config]) => {
              const Icon = config.icon
              const count = sourceCounts[source] || 0
              return (
                <div key={source} className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="text-sm font-medium">{config.label}</span>
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">- {config.description}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warning for standards guidelines */}
      {sourceCounts.standards > 0 && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  {sourceCounts.standards} guidelines loaded from settings.json
                </p>
                <p className="text-orange-600 dark:text-orange-500 mt-1">
                  Modifications to these guidelines are temporary and will be reset when the server restarts.
                  To permanently modify them, edit the source file:
                </p>
                <code className="text-xs bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded mt-2 inline-block">
                  packages/standards/config/settings.json
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guidelines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Source filter buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Source</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sourceFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSourceFilter('all')}
              >
                All ({guidelines?.length ?? 0})
              </Button>
              {(Object.entries(SOURCE_CONFIG) as [GuidelineSource, typeof SOURCE_CONFIG[GuidelineSource]][]).map(([source, config]) => {
                const Icon = config.icon
                const count = sourceCounts[source] || 0
                return (
                  <Button
                    key={source}
                    variant={sourceFilter === source ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSourceFilter(source)}
                    className="gap-2"
                  >
                    <Icon className={cn('h-4 w-4', sourceFilter !== source && config.color)} />
                    {config.label} ({count})
                  </Button>
                )
              })}
            </div>
          </div>
          {/* Category filter buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Category</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
              >
                All
              </Button>
              {uniqueCategories.sort().map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({categoryCounts[cat] || 0})
                </Button>
              ))}
            </div>
          </div>
          {/* Tag filter buttons */}
          {uniqueTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Tags</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tagFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagFilter('all')}
                >
                  All
                </Button>
                {uniqueTags.sort().map((tag) => (
                  <Button
                    key={tag}
                    variant={tagFilter === tag ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTagFilter(tag)}
                    className="gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag} ({tagCounts[tag] || 0})
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit form */}
      {(showForm || editingId) && (
        <GuidelineForm
          key={editingId || 'new'}
          guideline={editingId ? guidelines?.find((g) => g.id === editingId) : undefined}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {/* Guidelines list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !filteredGuidelines?.length ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No guidelines found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first guideline
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuidelines.map((guideline) => (
                <div
                  key={guideline.id}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    guideline.enabled !== false ? 'bg-background' : 'bg-muted/50 opacity-60'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: guideline.id,
                          enabled: guideline.enabled === false,
                        })
                      }
                      className="mt-1"
                    >
                      {guideline.enabled !== false ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{guideline.name}</p>
                        {(() => {
                          const source = (guideline.source || 'builtin') as GuidelineSource
                          const config = SOURCE_CONFIG[source]
                          const SourceIcon = config.icon
                          return (
                            <span title={`${config.label}: ${config.description}`} className="flex items-center">
                              <SourceIcon className={cn('h-4 w-4', config.color)} />
                            </span>
                          )
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        {guideline.content || guideline.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge
                          className={cn(
                            'text-xs border-0',
                            CATEGORY_COLORS[guideline.category] || CATEGORY_COLORS.general
                          )}
                        >
                          {guideline.category}
                        </Badge>
                        {guideline.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Priority: {guideline.priority}</span>
                        {guideline.source_path && (
                          <span className="text-muted-foreground/70" title={guideline.source_path}>
                            Source: {guideline.source_path.split('/').pop() || guideline.source_path.split('\\').pop()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Only allow edit/delete for db guidelines */}
                      {guideline.source === 'db' || !guideline.source ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(guideline.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(guideline.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">read-only</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface GuidelineFormProps {
  guideline?: Guideline
  onClose: () => void
}

const CATEGORY_OPTIONS = [
  { value: 'behavior', label: 'Behavior' },
  { value: 'security', label: 'Security' },
  { value: 'quality', label: 'Quality' },
  { value: 'performance', label: 'Performance' },
  { value: 'testing', label: 'Testing' },
  { value: 'logging', label: 'Logging' },
  { value: 'database', label: 'Database' },
  { value: 'general', label: 'General' },
]

function GuidelineForm({ guideline, onClose }: GuidelineFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(guideline?.name ?? '')
  const [category, setCategory] = useState(guideline?.category ?? 'general')
  const [content, setContent] = useState(guideline?.content ?? '')
  const [priority, setPriority] = useState(guideline?.priority ?? 1)
  const [tags, setTags] = useState(guideline?.tags?.join(', ') ?? '')
  const [condition, setCondition] = useState(guideline?.condition ?? '')
  const [enabled, setEnabled] = useState(guideline?.enabled ?? true)

  const createMutation = useMutation({
    mutationFn: (data: Partial<Guideline>) => api.createGuideline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guidelines'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Guideline>) =>
      api.updateGuideline(guideline!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guidelines'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      category,
      content,
      priority,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      condition: condition || undefined,
      enabled,
    }

    if (guideline) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{guideline ? 'Edit Guideline' : 'Add Guideline'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guideline name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border bg-background"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full mt-1 p-3 rounded-md border bg-background min-h-[100px]"
              placeholder="Enter guideline content..."
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma separated)</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="safety, coding"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Condition</label>
              <Input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Optional condition"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className="flex items-center gap-2"
            >
              {enabled ? (
                <ToggleRight className="h-6 w-6 text-green-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {guideline ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
