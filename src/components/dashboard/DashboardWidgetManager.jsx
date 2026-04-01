import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Settings2, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export default function DashboardWidgetManager({ currentConfig, availableWidgets, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const configMap = new Map(currentConfig.map(item => [item.id, item]));
      
      const mergedItems = availableWidgets.map((widget, index) => {
        const config = configMap.get(widget.id);
        return {
          id: widget.id,
          label: widget.label,
          visible: config ? config.visible : true,
          order: config ? config.order : index
        };
      });

      mergedItems.sort((a, b) => a.order - b.order);
      setItems(mergedItems);
    }
  }, [isOpen, currentConfig, availableWidgets]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const handleToggleVisibility = (id, checked) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, visible: checked } : item
    ));
  };

  const moveItem = (index, direction) => {
    const newItems = [...items];
    const targetIndex = index + direction;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      setItems(newItems);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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
          
          <div className="max-h-[60vh] overflow-y-auto px-1">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="widgets">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
                              snapshot.isDragging ? 'shadow-lg border-indigo-200 z-50' : 'border-slate-200'
                            }`}
                            style={provided.draggableProps.style}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded text-slate-400"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <span className="font-medium text-slate-700">{item.label}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Fallback buttons for accessibility or if DnD has issues */}
                              <div className="flex flex-col mr-2">
                                <button 
                                  onClick={() => moveItem(index, -1)} 
                                  disabled={index === 0}
                                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => moveItem(index, 1)} 
                                  disabled={index === items.length - 1}
                                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              {item.visible ? (
                                <Eye className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                              )}
                              <Switch 
                                checked={item.visible}
                                onCheckedChange={(checked) => handleToggleVisibility(item.id, checked)}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="">
            {isSaving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}