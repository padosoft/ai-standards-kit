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
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import type { Guideline } from '@/types'

export function GuidelinesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: guidelines, isLoading } = useQuery({
    queryKey: ['guidelines'],
    queryFn: api.getGuidelines,
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
    const text = g.content || g.description || ''
    return search
      ? text.toLowerCase().includes(search.toLowerCase()) ||
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      : true
  })

  const activeCount = guidelines?.filter((g) => g.enabled !== false).length ?? 0

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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guidelines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit form */}
      {(showForm || editingId) && (
        <GuidelineForm
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
                      <p className="font-medium text-sm">{guideline.name}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        {guideline.content || guideline.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
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
                      </div>
                    </div>

                    <div className="flex gap-2">
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

function GuidelineForm({ guideline, onClose }: GuidelineFormProps) {
  const queryClient = useQueryClient()
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
