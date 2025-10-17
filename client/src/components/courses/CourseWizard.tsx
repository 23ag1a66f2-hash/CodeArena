import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Settings, 
  FileText, 
  Video, 
  Code,
  Check,
  Plus,
  Trash2,
  Upload,
  Globe,
  Lock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CourseModule {
  id?: number;
  title: string;
  description: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
}

interface CourseFormData {
  title: string;
  description: string;
  isPublic: boolean;
  enableMarkComplete: boolean;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  prerequisites: string[];
  learningObjectives: string[];
  modules: CourseModule[];
  tags: string[];
}

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: FileText },
  { id: 'content', title: 'Course Content', icon: BookOpen },
  { id: 'modules', title: 'Course Modules', icon: Video },
  { id: 'settings', title: 'Settings & Review', icon: Settings }
];

export function CourseWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    isPublic: true,
    enableMarkComplete: true,
    category: '',
    difficulty: 'beginner',
    estimatedHours: 1,
    prerequisites: [],
    learningObjectives: [],
    modules: [],
    tags: []
  });

  const [currentPrerequisite, setCurrentPrerequisite] = useState('');
  const [currentObjective, setCurrentObjective] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      return apiRequest('POST', '/api/courses', courseData);
    },
    onSuccess: () => {
      toast({
        title: "Course Created",
        description: "Your course has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/courses'] });
      setLocation('/admin/courses');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    }
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPrerequisite = () => {
    if (currentPrerequisite.trim()) {
      updateFormData('prerequisites', [...formData.prerequisites, currentPrerequisite.trim()]);
      setCurrentPrerequisite('');
    }
  };

  const removePrerequisite = (index: number) => {
    updateFormData('prerequisites', formData.prerequisites.filter((_, i) => i !== index));
  };

  const addObjective = () => {
    if (currentObjective.trim()) {
      updateFormData('learningObjectives', [...formData.learningObjectives, currentObjective.trim()]);
      setCurrentObjective('');
    }
  };

  const removeObjective = (index: number) => {
    updateFormData('learningObjectives', formData.learningObjectives.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      updateFormData('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateFormData('tags', formData.tags.filter(t => t !== tag));
  };

  const addModule = () => {
    const newModule: CourseModule = {
      title: '',
      description: '',
      order: formData.modules.length + 1,
      textContent: '',
      videoUrl: '',
      codeExample: '',
      language: 'javascript',
      expectedOutput: ''
    };
    updateFormData('modules', [...formData.modules, newModule]);
  };

  const updateModule = (index: number, field: string, value: any) => {
    const updatedModules = formData.modules.map((module, i) => 
      i === index ? { ...module, [field]: value } : module
    );
    updateFormData('modules', updatedModules);
  };

  const removeModule = (index: number) => {
    const updatedModules = formData.modules
      .filter((_, i) => i !== index)
      .map((module, i) => ({ ...module, order: i + 1 }));
    updateFormData('modules', updatedModules);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 1: // Course Content
        return formData.learningObjectives.length > 0;
      case 2: // Modules
        return formData.modules.length > 0 && formData.modules.every(m => m.title.trim() !== '');
      case 3: // Settings & Review
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      createCourseMutation.mutate(formData);
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/admin/courses')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Create New Course</h1>
        <p className="text-muted-foreground">Follow the steps to create a comprehensive course</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                    isCurrent ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}
                `}>
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {React.createElement(WIZARD_STEPS[currentStep].icon, { className: "h-5 w-5 mr-2" })}
            {WIZARD_STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Enter course title"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Course Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe what students will learn in this course"
                  className="mt-1 min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => updateFormData('category', e.target.value)}
                    placeholder="e.g., Web Development, Data Science"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={formData.difficulty}
                    onChange={(e) => updateFormData('difficulty', e.target.value as any)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="1"
                  value={formData.estimatedHours}
                  onChange={(e) => updateFormData('estimatedHours', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Course Content */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Prerequisites</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentPrerequisite}
                    onChange={(e) => setCurrentPrerequisite(e.target.value)}
                    placeholder="Add a prerequisite"
                    onKeyPress={(e) => e.key === 'Enter' && addPrerequisite()}
                  />
                  <Button type="button" onClick={addPrerequisite}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.prerequisites.map((prereq, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {prereq}
                      <button onClick={() => removePrerequisite(index)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Learning Objectives *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentObjective}
                    onChange={(e) => setCurrentObjective(e.target.value)}
                    placeholder="Add a learning objective"
                    onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                  />
                  <Button type="button" onClick={addObjective}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.learningObjectives.map((objective, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {objective}
                      <button onClick={() => removeObjective(index)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Course Modules */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Course Modules</h3>
                <Button onClick={addModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>

              {formData.modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No modules added yet. Click "Add Module" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.modules.map((module, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Module {module.order}</Badge>
                            <Input
                              value={module.title}
                              onChange={(e) => updateModule(index, 'title', e.target.value)}
                              placeholder="Module title"
                              className="font-medium"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModule(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={module.description}
                            onChange={(e) => updateModule(index, 'description', e.target.value)}
                            placeholder="Module description"
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Video URL (Optional)</Label>
                            <Input
                              value={module.videoUrl}
                              onChange={(e) => updateModule(index, 'videoUrl', e.target.value)}
                              placeholder="https://youtube.com/watch?v=..."
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label>Programming Language</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                              value={module.language}
                              onChange={(e) => updateModule(index, 'language', e.target.value)}
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                              <option value="html">HTML</option>
                              <option value="css">CSS</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Text Content</Label>
                          <Textarea
                            value={module.textContent}
                            onChange={(e) => updateModule(index, 'textContent', e.target.value)}
                            placeholder="Write your lesson content here..."
                            className="mt-1 min-h-[100px]"
                          />
                        </div>
                        
                        <div>
                          <Label>Code Example (Optional)</Label>
                          <Textarea
                            value={module.codeExample}
                            onChange={(e) => updateModule(index, 'codeExample', e.target.value)}
                            placeholder="// Add code example here"
                            className="mt-1 font-mono"
                          />
                        </div>
                        
                        <div>
                          <Label>Expected Output (Optional)</Label>
                          <Input
                            value={module.expectedOutput}
                            onChange={(e) => updateModule(index, 'expectedOutput', e.target.value)}
                            placeholder="Expected output for code example"
                            className="mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Settings & Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => updateFormData('isPublic', checked)}
                />
                <div className="flex items-center gap-2">
                  {formData.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <Label htmlFor="isPublic">
                    {formData.isPublic ? 'Public Course' : 'Private Course'}
                  </Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableMarkComplete"
                  checked={formData.enableMarkComplete}
                  onCheckedChange={(checked) => updateFormData('enableMarkComplete', checked)}
                />
                <Label htmlFor="enableMarkComplete">
                  Enable Mark Complete
                </Label>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Course Summary</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formData.title || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formData.category || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Badge variant="secondary" className="mt-1">
                        {formData.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <Label>Estimated Hours</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formData.estimatedHours} hours</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{formData.description || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <Label>Learning Objectives ({formData.learningObjectives.length})</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.learningObjectives.map((obj, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Modules ({formData.modules.length})</Label>
                    <div className="mt-1 space-y-1">
                      {formData.modules.map((module, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {index + 1}. {module.title || 'Untitled Module'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep(currentStep) || createCourseMutation.isPending}
            >
              {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}