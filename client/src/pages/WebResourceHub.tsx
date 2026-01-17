/**
 * Web Resource Hub - Frequently Used Sites
 * 
 * Features:
 * - Users can add URLs
 * - Admin can update/delete entries and manage categories
 * - Favicon fetching and storage
 * - Mahjong tile-style cards
 * - Collapsible categories
 * - Search functionality
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Globe, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Search,
  LogIn,
  LogOut,
  ArrowLeft,
  Download,
  Upload,
  GripVertical
} from "lucide-react";
import { saveData, loadData } from "@/lib/db";

interface WebResource {
  id: string;
  url: string;
  name: string;
  category: string;
  favicon: string;
  addedBy: "user" | "admin";
  createdAt: number;
}

export default function WebResourceHub() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState("");
  const [resources, setResources] = useState<WebResource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load resources from IndexedDB
  useEffect(() => {
    loadData("sbi-web-resources").then(data => {
      if (data) {
        setResources(data);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem("sbi-web-resources");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setResources(parsed);
            saveData("sbi-web-resources", parsed); // Migrate to IndexedDB
          } catch {
            setResources([]);
          }
        }
      }
    });
  }, []);

  // Save resources to IndexedDB
  useEffect(() => {
    if (resources.length >= 0) {
      saveData("sbi-web-resources", resources);
    }
  }, [resources]);

  const handleLogin = () => {
    if (password === "sbi@13042") {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassword("");
    } else {
      alert("Incorrect password");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setEditingId(null);
    clearForm();
  };

  const getFavicon = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return "";
    }
  };

  const addResource = () => {
    if (!formUrl || !formName || !formCategory) {
      alert("Please fill in all fields");
      return;
    }

    const newResource: WebResource = {
      id: Date.now().toString(),
      url: formUrl.startsWith("http") ? formUrl : `https://${formUrl}`,
      name: formName,
      category: formCategory,
      favicon: getFavicon(formUrl),
      addedBy: isAdmin ? "admin" : "user",
      createdAt: Date.now()
    };

    setResources([...resources, newResource]);
    clearForm();
  };

  const updateResource = () => {
    if (!editingId || !formUrl || !formName || !formCategory) return;

    setResources(resources.map(r =>
      r.id === editingId
        ? {
            ...r,
            url: formUrl.startsWith("http") ? formUrl : `https://${formUrl}`,
            name: formName,
            category: formCategory,
            favicon: getFavicon(formUrl)
          }
        : r
    ));
    setEditingId(null);
    clearForm();
  };

  const deleteResource = (id: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      setResources(resources.filter(r => r.id !== id));
    }
  };

  const startEdit = (resource: WebResource) => {
    setEditingId(resource.id);
    setFormUrl(resource.url);
    setFormName(resource.name);
    setFormCategory(resource.category);
  };

  const clearForm = () => {
    setFormUrl("");
    setFormName("");
    setFormCategory("");
    setEditingId(null);
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    const data = JSON.stringify(resources, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Web_Resources_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Resources exported successfully!");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setResources(data);
          alert("Resources imported successfully!");
        } else {
          alert("Invalid file format");
        }
      } catch (error) {
        alert("Failed to import data. Please check the file format.");
      }
    };
    input.click();
  };

  // Group resources by category
  const categorizedResources = resources.reduce((acc, resource) => {
    const category = resource.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(resource);
    return acc;
  }, {} as Record<string, WebResource[]>);

  // Filter by search query
  const filteredCategories = Object.entries(categorizedResources).reduce((acc, [category, items]) => {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, WebResource[]>);

  const allCategories = Object.keys(categorizedResources).sort();

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: "#f7f4fb",
        fontFamily: "'Poppins', 'Effra', sans-serif"
      }}
    >
      {/* Header */}
      <header 
        className="w-full py-2 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)"
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img 
                src="/images/sbi-logo.png" 
                alt="State Bank of India" 
                className="h-28 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 
                className="text-white font-semibold leading-tight"
                style={{ fontSize: "1.3rem" }}
              >
                Web Resource Hub
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                PBB New Market Branch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-green-600/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
                  title="Export resources"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
                  title="Import resources"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import</span>
                </button>
              </>
            )}
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back to Home */}
          <Link href="/">
            <button className="flex items-center gap-2 text-purple-700 hover:text-purple-900 mb-6 font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>

          {/* Add/Edit Form */}
          <div className="bg-white rounded-xl p-6 shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#4e1a74" }}>
              {editingId ? "Edit URL/Website" : "Add New URL/Website"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL *
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Portal Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Internet, Intranet, HRMS"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    list="categories"
                  />
                ) : (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select Category</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
                <datalist id="categories">
                  {allCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex gap-3">
              {editingId ? (
                <>
                  <button
                    onClick={updateResource}
                    className="bg-gradient-to-r from-pink-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Update
                  </button>
                  <button
                    onClick={clearForm}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={addResource}
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add URL/Website
                  </button>
                  <button
                    onClick={clearForm}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl p-4 shadow-md mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a website..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Resources by Category */}
          <div className="space-y-4">
            {Object.entries(filteredCategories).length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-md text-center text-gray-500">
                No resources found. Add your first resource above!
              </div>
            ) : (
              Object.entries(filteredCategories).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(category) ? (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                      <h3 className="text-lg font-semibold" style={{ color: "#4e1a74" }}>
                        {category}
                      </h3>
                      <span className="text-sm text-gray-500">({items.length})</span>
                    </div>
                  </button>

                  {/* Category Content */}
                  {!collapsedCategories.has(category) && (
                    <div className="p-4 pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {items.map((resource) => (
                          <div
                            key={resource.id}
                            className="relative group"
                          >
                            {/* Mahjong Tile Card */}
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300"
                              style={{
                                aspectRatio: "3/4",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              {/* Favicon */}
                              <div className="mb-3">
                                {resource.favicon ? (
                                  <img
                                    src={resource.favicon}
                                    alt={resource.name}
                                    className="w-12 h-12 object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <Globe 
                                  className={`w-12 h-12 text-gray-400 ${resource.favicon ? "hidden" : ""}`}
                                />
                              </div>

                              {/* Name */}
                              <p className="text-center text-sm font-medium text-gray-700 line-clamp-2">
                                {resource.name}
                              </p>
                            </a>

                            {/* Admin Actions */}
                            {isAdmin && (
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    startEdit(resource);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                  className="bg-blue-500 text-white p-1.5 rounded-md hover:bg-blue-600 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteResource(resource.id);
                                  }}
                                  className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-300 mt-8">
        <p className="text-center text-gray-600 text-sm">
          Ideation by <strong>Shivam Kaushik</strong> Developed with AI
        </p>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: "#4e1a74" }}>
              Admin Login
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Enter admin password"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-700 text-white py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setPassword("");
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
