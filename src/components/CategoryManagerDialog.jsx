import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, Plus } from "lucide-react";
import { supabase } from "../supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

const CategoryManagerDialog = ({ onClose }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ value: "", label: "", color: "#6c757d" });
  const [editingCategory, setEditingCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("label");
    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error fetching categories");
    } else {
      setCategories(data);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const validate = () => {
    const errs = {};
    if (!newCategory.label) errs.label = "Category label is required.";
    if (!newCategory.color) errs.color = "Color is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddCategory = async () => {
    if (!validate()) return;
    const value = newCategory.label.toLowerCase().replace(/\s+/g, "_");
    const { data, error } = await supabase
      .from("categories")
      .insert([{ value, label: newCategory.label, color: newCategory.color }])
      .select();
    if (error) {
      console.error("Error adding category:", error);
      toast.error("Error adding category");
    } else {
      toast.success("Category added successfully!");
      setNewCategory({ value: "", label: "", color: "#6c757d" });
      fetchCategories();
    }
  };

  const handleUpdateCategory = async () => {
    if (!validate()) return;
    const { error } = await supabase
      .from("categories")
      .update({ label: newCategory.label, color: newCategory.color })
      .eq("id", editingCategory.id);
    if (error) {
      console.error("Error updating category:", error);
      toast.error("Error updating category");
    } else {
      toast.success("Category updated successfully!");
      setEditingCategory(null);
      setNewCategory({ value: "", label: "", color: "#6c757d" });
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);
    if (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category");
    } else {
      toast.success("Category deleted successfully!");
      setEditingCategory(null);
      setNewCategory({ value: "", label: "", color: "#6c757d" });
      fetchCategories();
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Manage Categories
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Category Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryLabel" className="text-sm font-medium">
                  Category Label
                </Label>
                <Input
                  id="categoryLabel"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                  className="w-full"
                />
                {errors.label && (
                  <p className="text-sm text-red-500 mt-1">{errors.label}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="categoryColor" className="text-sm font-medium">
                  Color
                </Label>
                <Input
                  id="categoryColor"
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-full h-10"
                />
                {errors.color && (
                  <p className="text-sm text-red-500 mt-1">{errors.color}</p>
                )}
              </div>
            </div>
      
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {editingCategory ? (
                <>
                  <Button onClick={handleUpdateCategory} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    <span>Update</span>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setCategoryToDelete(editingCategory.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setEditingCategory(null); 
                      setNewCategory({ value: "", label: "", color: "#6c757d" }); 
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleAddCategory} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </Button>
              )}
            </div>
      
            {/* Existing Categories */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Existing Categories</h3>
              <ScrollArea className="h-64 w-full rounded-md border">
                <ul className="p-4 space-y-2">
                  {categories.map((cat) => (
                    <li key={cat.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-6 h-6 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        ></div>
                        <span className="font-medium">{cat.label}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                          setEditingCategory(cat); 
                          setNewCategory({ label: cat.label, color: cat.color }); 
                        }}
                      >
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </div>
      
          
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoryManagerDialog;