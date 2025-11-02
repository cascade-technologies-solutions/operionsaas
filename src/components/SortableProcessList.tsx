import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Process } from '@/types';

interface SortableProcessItemProps {
  process: Process;
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableProcessItem = ({ 
  process, 
  index, 
  totalItems, 
  onMoveUp, 
  onMoveDown 
}: SortableProcessItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: process._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 bg-muted rounded ${
        isDragging ? 'shadow-lg border-2 border-primary' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted-foreground/20 rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Settings className="h-4 w-4 text-primary" />
        <span className="font-medium">{process.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          Process {index + 1}
        </Badge>
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-muted-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalItems - 1}
            className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-muted-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move down"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
};

interface SortableProcessListProps {
  processes: Process[];
  productId: string;
  onReorder: (productId: string, newOrder: Process[]) => void;
  onMoveUp: (productId: string, processId: string) => void;
  onMoveDown: (productId: string, processId: string) => void;
}

export const SortableProcessList = ({
  processes,
  productId,
  onReorder,
  onMoveUp,
  onMoveDown,
}: SortableProcessListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = processes.findIndex((process) => process._id === active.id);
      const newIndex = processes.findIndex((process) => process._id === over.id);

      const newOrder = arrayMove(processes, oldIndex, newIndex);
      onReorder(productId, newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={processes.map(p => p._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {processes.map((process, index) => (
            <SortableProcessItem
              key={process._id}
              process={process}
              index={index}
              totalItems={processes.length}
              onMoveUp={() => onMoveUp(productId, process._id)}
              onMoveDown={() => onMoveDown(productId, process._id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
