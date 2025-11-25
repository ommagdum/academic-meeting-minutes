import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Clock, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingFormData } from '../MultiStepMeetingForm';

interface AgendaItemsStepProps {
  data: MeetingFormData;
  onUpdate: (updates: Partial<MeetingFormData>) => void;
}

const DURATION_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' }
];

const AGENDA_TEMPLATES = [
  {
    name: 'Committee Meeting',
    items: [
      { title: 'Call to Order', estimatedDuration: 5, description: 'Meeting opening and attendance' },
      { title: 'Previous Minutes Review', estimatedDuration: 10, description: 'Review and approval of previous meeting minutes' },
      { title: 'Committee Reports', estimatedDuration: 20, description: 'Reports from various committee members' },
      { title: 'Old Business', estimatedDuration: 15, description: 'Discussion of ongoing matters' },
      { title: 'New Business', estimatedDuration: 20, description: 'New items for consideration' },
      { title: 'Action Items Review', estimatedDuration: 10, description: 'Review of assigned tasks and deadlines' },
      { title: 'Next Meeting', estimatedDuration: 5, description: 'Schedule and agenda for next meeting' },
      { title: 'Adjournment', estimatedDuration: 5, description: 'Meeting closure' }
    ]
  },
  {
    name: 'Faculty Meeting',
    items: [
      { title: 'Welcome & Attendance', estimatedDuration: 5, description: 'Meeting opening' },
      { title: 'Academic Updates', estimatedDuration: 20, description: 'Updates on academic programs and policies' },
      { title: 'Research Presentations', estimatedDuration: 30, description: 'Faculty research updates' },
      { title: 'Administrative Matters', estimatedDuration: 15, description: 'Administrative announcements and policies' },
      { title: 'Student Affairs', estimatedDuration: 15, description: 'Student-related discussions' },
      { title: 'Open Discussion', estimatedDuration: 10, description: 'Open floor for faculty concerns' }
    ]
  },
  {
    name: 'Research Review',
    items: [
      { title: 'Project Overview', estimatedDuration: 15, description: 'Current research project status' },
      { title: 'Progress Report', estimatedDuration: 30, description: 'Detailed progress and findings' },
      { title: 'Challenges & Solutions', estimatedDuration: 20, description: 'Issues faced and proposed solutions' },
      { title: 'Budget Review', estimatedDuration: 15, description: 'Financial status and requirements' },
      { title: 'Next Milestones', estimatedDuration: 15, description: 'Upcoming goals and deadlines' },
      { title: 'Resource Requirements', estimatedDuration: 10, description: 'Additional resources needed' }
    ]
  }
];

export function AgendaItemsStep({ data, onUpdate }: AgendaItemsStepProps) {
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    estimatedDuration: 15
  });

  const addAgendaItem = () => {
    if (!newItem.title?.trim()) return;

    const item = {
      id: Date.now().toString(),
      title: newItem.title,
      description: newItem.description || '',
      estimatedDuration: newItem.estimatedDuration || 15,
      orderIndex: data.agendaItems.length
    };

    onUpdate({
      agendaItems: [...data.agendaItems, item]
    });

    setNewItem({
      title: '',
      description: '',
      estimatedDuration: 15
    });
  };

  const removeAgendaItem = (id: string) => {
    const updatedItems = data.agendaItems
      .filter(item => item.id !== id)
      .map((item, index) => ({ ...item, orderIndex: index }));
    
    onUpdate({ agendaItems: updatedItems });
  };

  const updateAgendaItem = (id: string, updates: Partial<typeof data.agendaItems[0]>) => {
    onUpdate({
      agendaItems: data.agendaItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const loadTemplate = (templateName: string) => {
    const template = AGENDA_TEMPLATES.find(t => t.name === templateName);
    if (!template) return;

    const items = template.items.map((item, index) => ({
      id: `template-${Date.now()}-${index}`,
      title: item.title,
      description: item.description,
      estimatedDuration: item.estimatedDuration,
      orderIndex: index
    }));

    onUpdate({ agendaItems: items });
  };

  const totalDuration = data.agendaItems.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0);

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Quick Start Templates</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {AGENDA_TEMPLATES.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => loadTemplate(template.name)}
              className="text-xs"
            >
              {template.name}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Choose a template to quickly populate common agenda items, or create your own below.
        </p>
      </div>

      {/* Add New Item Form */}
      <Card className="border-dashed border-2 border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Add Agenda Item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="new-title"
              placeholder="e.g., Committee Report"
              value={newItem.title || ''}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-description" className="text-sm font-medium">
              Description
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="new-description"
                placeholder="Brief description of what will be discussed..."
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="pl-9 min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Duration</Label>
              <Select
                value={newItem.estimatedDuration?.toString() || '15'}
                onValueChange={(value) => setNewItem({ ...newItem, estimatedDuration: parseInt(value) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={addAgendaItem}
              disabled={!newItem.title?.trim()}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agenda Items List */}
      {data.agendaItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Meeting Agenda</h3>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Total: {totalDuration} min</span>
            </Badge>
          </div>

          <div className="space-y-3">
            {data.agendaItems.map((item, index) => (
              <Card key={item.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Agenda item title"
                          value={item.title}
                          onChange={(e) => updateAgendaItem(item.id, { title: e.target.value })}
                          className="font-medium flex-1"
                        />
                        <Select
                          value={item.estimatedDuration?.toString() || '15'}
                          onValueChange={(value) => updateAgendaItem(item.id, { estimatedDuration: parseInt(value) })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Textarea
                        placeholder="Description of what will be discussed..."
                        value={item.description}
                        onChange={(e) => updateAgendaItem(item.id, { description: e.target.value })}
                        className="min-h-[60px] text-sm"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgendaItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 AI Extraction Benefits</p>
        <p>
          Adding detailed agenda items helps our AI system provide more accurate and structured
          meeting minutes. The AI will use these topics to organize discussions and identify
          decisions related to each agenda item.
        </p>
      </div>

      {data.agendaItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No agenda items yet</p>
          <p className="text-sm">
            Add agenda items above to help structure your meeting and improve AI extraction accuracy.
          </p>
        </div>
      )}
    </div>
  );
}
