import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  X, 
  Save, 
  Trash2, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Underline
} from "lucide-react";
import { Select } from "@/components/ui/select";

export interface TemplateElement {
  id: string;
  type: "field" | "text" | "static";
  content: string; // field name or static text
  x: number;
  y: number;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  textAlign: "left" | "center" | "right";
  width?: number;
}

export interface NoticeTemplate {
  id: string;
  name: string;
  elements: TemplateElement[];
  createdAt: number;
  updatedAt: number;
}

interface TemplateDesignerProps {
  onClose: () => void;
  onSave: (template: NoticeTemplate) => void;
  existingTemplate?: NoticeTemplate;
}

const AVAILABLE_FIELDS = [
  { id: "ref_no", label: "Reference Number", value: "{{ref_no}}" },
  { id: "date", label: "Letter Date", value: "{{date}}" },
  { id: "customer_name", label: "Customer Name", value: "{{customer_name}}" },
  { id: "father_name", label: "Father Name", value: "{{father_name}}" },
  { id: "spouse_name", label: "Spouse Name", value: "{{spouse_name}}" },
  { id: "account_no", label: "Account Number", value: "{{account_no}}" },
  { id: "address1", label: "Address Line 1", value: "{{address1}}" },
  { id: "address2", label: "Address Line 2", value: "{{address2}}" },
  { id: "address3", label: "Address Line 3", value: "{{address3}}" },
  { id: "postcode", label: "PIN Code", value: "{{postcode}}" },
  { id: "mobile", label: "Mobile Number", value: "{{mobile}}" },
  { id: "outstanding", label: "Outstanding Amount", value: "{{outstanding}}" },
];

export default function TemplateDesigner({ onClose, onSave, existingTemplate }: TemplateDesignerProps) {
  const [templateName, setTemplateName] = useState(existingTemplate?.name || "");
  const [elements, setElements] = useState<TemplateElement[]>(existingTemplate?.elements || []);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addElement = (content: string, x: number, y: number, type: "field" | "text" | "static" = "field") => {
    const newElement: TemplateElement = {
      id: `elem-${Date.now()}-${Math.random()}`,
      type,
      content,
      x,
      y,
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      width: 400,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addElement(draggedField, x, y, "field");
    setDraggedField(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateElement = (id: string, updates: Partial<TemplateElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    const template: NoticeTemplate = {
      id: existingTemplate?.id || `template-${Date.now()}`,
      name: templateName,
      elements,
      createdAt: existingTemplate?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(template);
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-semibold" style={{ color: "#4e1a74" }}>
              Template Designer
            </h2>
            <Input
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} style={{ backgroundColor: "#d4007f" }}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Field Palette */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3" style={{ color: "#4e1a74" }}>
              Available Fields
            </h3>
            <div className="space-y-2">
              {AVAILABLE_FIELDS.map(field => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDraggedField(field.value)}
                  className="p-2 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
                >
                  <div className="text-sm font-medium">{field.label}</div>
                  <div className="text-xs text-gray-500">{field.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = prompt("Enter static text:");
                  if (text) addElement(text, 50, 50, "static");
                }}
                className="w-full"
              >
                <Type className="w-4 h-4 mr-2" />
                Add Static Text
              </Button>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div
              ref={canvasRef}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              className="bg-white shadow-lg mx-auto relative"
              style={{
                width: "210mm",
                height: "297mm",
                padding: "20mm",
              }}
            >
              {elements.map(element => (
                <div
                  key={element.id}
                  onClick={() => setSelectedElement(element.id)}
                  className={`absolute cursor-move border-2 transition-colors ${
                    selectedElement === element.id
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  style={{
                    left: element.x,
                    top: element.y,
                    fontSize: `${element.fontSize}px`,
                    fontWeight: element.fontWeight,
                    fontStyle: element.fontStyle,
                    textDecoration: element.textDecoration,
                    textAlign: element.textAlign,
                    width: element.width ? `${element.width}px` : "auto",
                    minWidth: "50px",
                    padding: "4px",
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("elementId", element.id);
                  }}
                  onDragEnd={(e) => {
                    if (!canvasRef.current) return;
                    const rect = canvasRef.current.getBoundingClientRect();
                    const newX = e.clientX - rect.left;
                    const newY = e.clientY - rect.top;
                    updateElement(element.id, { x: newX, y: newY });
                  }}
                >
                  {element.type === "field" ? (
                    <span className="text-blue-600 font-mono">{element.content}</span>
                  ) : (
                    <span>{element.content}</span>
                  )}
                </div>
              ))}

              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Drag fields from the left panel to design your template</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-64 border-l p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3" style={{ color: "#4e1a74" }}>
              Properties
            </h3>

            {selectedEl ? (
              <div className="space-y-4">
                <div>
                  <Label>Content</Label>
                  <Input
                    value={selectedEl.content}
                    onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedEl.x)}
                      onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedEl.y)}
                      onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={selectedEl.fontSize}
                    onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 12 })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Width (px)</Label>
                  <Input
                    type="number"
                    value={selectedEl.width || 400}
                    onChange={(e) => updateElement(selectedEl.id, { width: parseInt(e.target.value) || 400 })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Text Style</Label>
                  <div className="flex gap-1 mt-1">
                    <Button
                      variant={selectedEl.fontWeight === "bold" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { 
                        fontWeight: selectedEl.fontWeight === "bold" ? "normal" : "bold" 
                      })}
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedEl.fontStyle === "italic" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { 
                        fontStyle: selectedEl.fontStyle === "italic" ? "normal" : "italic" 
                      })}
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedEl.textDecoration === "underline" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { 
                        textDecoration: selectedEl.textDecoration === "underline" ? "none" : "underline" 
                      })}
                    >
                      <Underline className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Text Align</Label>
                  <div className="flex gap-1 mt-1">
                    <Button
                      variant={selectedEl.textAlign === "left" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { textAlign: "left" })}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedEl.textAlign === "center" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { textAlign: "center" })}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={selectedEl.textAlign === "right" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateElement(selectedEl.id, { textAlign: "right" })}
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteElement(selectedEl.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Element
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Select an element on the canvas to edit its properties
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
