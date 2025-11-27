import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Settings2, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Sortable Item Component
function SortableItem({ item, onToggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center justify-between p-3 bg-white border rounded-lg mb-2 ${isDragging ? 'shadow-lg border-indigo-200' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-3">
        <button 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </button>
        <span className="font-medium text-slate-700">{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {item.visible ? (
          <Eye className="w-4 h-4 text-emerald-500" />
        ) : (
          <EyeOff className="w-4 h-4 text-slate-400" />
        )}
        <Switch 
          checked={item.visible}
          onCheckedChange={(checked) => onToggleVisibility(item.id, checked)}
        />
      </div>
    </div>
  );
}

export default function DashboardWidgetManager({ currentConfig, availableWidgets, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Merge available widgets with current config
      // This ensures new widgets are available even if not in user config yet
      const configMap = new Map(currentConfig.map(item => [item.id, item]));
      
      const mergedItems = availableWidgets.map((widget, index) => {
        const config = configMap.get(widget.id);
        return {
          id: widget.id,
          label: widget.label,
          visible: config ? config.visible : true, // Default visible
          order: config ? config.order : index
        };
      });

      // Sort by order
      mergedItems.sort((a, b) => a.order - b.order);
      setItems(mergedItems);
    }
  }, [isOpen, currentConfig, availableWidgets]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleVisibility = (id, checked) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, visible: checked } : item
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Create clean config object to save
      const newConfig = items.map((item, index) => ({
        id: item.id,
        visible: item.visible,
        order: index
      }));
      
      await onSave(newConfig);
      setIsOpen(false);
      toast.success("Layout salvato con successo");
    } catch (error) {
      console.error("Errore salvataggio layout:", error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
          <Settings2 className="w-4 h-4" />
          Personalizza Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizza Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-sm text-slate-500 mb-4">
            Trascina per riordinare i widget o usa l'interruttore per nasconderli.
          </p>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-h-[60vh] overflow-y-auto px-1">
                {items.map((item) => (
                  <SortableItem 
                    key={item.id} 
                    item={item} 
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}