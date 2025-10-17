import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const mcqOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text is required"),
  isCorrect: z.boolean(),
});

const assignmentQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["mcq", "coding"]),
  title: z.string().min(1, "Question title is required"),
  description: z.string().min(1, "Question description is required"),
  points: z.number().min(1, "Points must be at least 1"),
  options: z.array(mcqOptionSchema).optional(),
  problemStatement: z.string().optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  timeLimit: z.number().optional(),
  memoryLimit: z.number().optional(),
});

const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseTag: z.string().min(1, "Course tag is required"),
  deadline: z.string().optional(),
  questions: z.array(assignmentQuestionSchema).min(1, "At least one question is required"),
  maxAttempts: z.number().min(1, "Max attempts must be at least 1"),
  isVisible: z.boolean(),
  autoGrade: z.boolean(),
});

type CreateAssignmentForm = z.infer<typeof createAssignmentSchema>;

export default function CreateAssignment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateAssignmentForm>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      courseTag: "",
      deadline: "",
      questions: [],
      maxAttempts: 3,
      isVisible: true,
      autoGrade: true,
    },
  });

  const { fields: questions, append: addQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: CreateAssignmentForm) => {
      try {
        console.log('[DEBUG] Submitting assignment data:', data);
        
        // First attempt
        try {
          const response = await apiRequest("/api/assignments", "POST", data);
          const responseData = await response.json();
          
          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create assignment');
          }
          
          return responseData;
        } catch (error) {
          console.error('[DEBUG] First attempt failed, retrying:', error);
          
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Second attempt
          const response = await apiRequest("/api/assignments", "POST", data);
          const responseData = await response.json();
          
          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create assignment');
          }
          
          return responseData;
        }
      } catch (error: any) {
        console.error('[DEBUG] Assignment creation error:', error);
        throw new Error(error.message || 'Failed to create assignment');
      }
    },
    onSuccess: (data) => {
      console.log('[DEBUG] Assignment created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assignments"] });
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      navigate("/admin/assignments");
    },
    onError: (error: any) => {
      console.error('[DEBUG] Assignment creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    },
  });

  const addMCQQuestion = () => {
    addQuestion({
      id: nanoid(),
      type: "mcq",
      title: "",
      description: "",
      points: 1,
      options: [
        { id: nanoid(), text: "", isCorrect: false },
        { id: nanoid(), text: "", isCorrect: false },
      ],
    });
  };

  const addCodingQuestion = () => {
    addQuestion({
      id: nanoid(),
      type: "coding",
      title: "",
      description: "",
      points: 5,
      problemStatement: "",
      inputFormat: "",
      outputFormat: "",
      timeLimit: 1000,
      memoryLimit: 256,
    });
  };

  const addOptionToQuestion = (questionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    form.setValue(`questions.${questionIndex}.options`, [
      ...currentOptions,
      { id: nanoid(), text: "", isCorrect: false },
    ]);
  };

  const removeOptionFromQuestion = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    if (currentOptions.length > 2) {
      const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
      form.setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    const newOptions = currentOptions.map((option, i) => ({
      ...option,
      isCorrect: i === optionIndex,
    }));
    form.setValue(`questions.${questionIndex}.options`, newOptions);
  };

  const onSubmit = async (data: CreateAssignmentForm) => {
    try {
      // Validate MCQ questions have at least one correct answer and valid options
      for (const question of data.questions) {
        if (question.type === "mcq") {
          if (!question.options || question.options.length < 2) {
            toast({
              title: "Validation Error",
              description: `MCQ question "${question.title}" must have at least 2 options`,
              variant: "destructive",
            });
            return;
          }

          const hasCorrectAnswer = question.options.some(option => option.isCorrect);
          if (!hasCorrectAnswer) {
            toast({
              title: "Validation Error",
              description: `MCQ question "${question.title}" must have at least one correct answer`,
              variant: "destructive",
            });
            return;
          }

          // Validate all options have text
          const emptyOptions = question.options.filter(opt => !opt.text.trim());
          if (emptyOptions.length > 0) {
            toast({
              title: "Validation Error",
              description: `All options in question "${question.title}" must have text`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Format the data
      const formattedData = {
        ...data,
        title: data.title.trim(),
        description: data.description?.trim(),
        courseTag: data.courseTag.trim(),
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        questions: data.questions.map(q => ({
          ...q,
          id: q.id || nanoid(),
          title: q.title.trim(),
          description: q.description.trim(),
          points: Number(q.points) || 1,
          options: q.type === 'mcq' ? q.options?.map(opt => ({
            id: opt.id || nanoid(),
            text: opt.text.trim(),
            isCorrect: !!opt.isCorrect
          })) : undefined,
          timeLimit: q.timeLimit ? Number(q.timeLimit) : undefined,
          memoryLimit: q.memoryLimit ? Number(q.memoryLimit) : undefined
        })),
        maxAttempts: Number(data.maxAttempts) || 3,
        isVisible: !!data.isVisible,
        autoGrade: !!data.autoGrade
      };

      console.log('[DEBUG] Submitting assignment data:', formattedData);
      
      // Show loading toast
      toast({
        title: "Creating Assignment",
        description: "Please wait while we create your assignment...",
      });
      
      await createAssignmentMutation.mutateAsync(formattedData);
    } catch (error: any) {
      console.error('[DEBUG] Form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate("/admin/assignments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assignments
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Assignment</h1>
          <p className="text-muted-foreground">Create a new assignment with MCQ and coding questions</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Set up the basic details for your assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter assignment title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="courseTag">Course Tag</Label>
                <Select onValueChange={(value) => form.setValue("courseTag", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="DSA">Data Structures & Algorithms</SelectItem>
                    <SelectItem value="Java">Java</SelectItem>
                    <SelectItem value="C++">C++</SelectItem>
                    <SelectItem value="React">React</SelectItem>
                    <SelectItem value="Node.js">Node.js</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.courseTag && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.courseTag.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  {...form.register("deadline")}
                />
              </div>
              <div>
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min="1"
                  {...form.register("maxAttempts", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Settings</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isVisible"
                    checked={form.watch("isVisible")}
                    onCheckedChange={(checked) => form.setValue("isVisible", !!checked)}
                  />
                  <Label htmlFor="isVisible">Visible to students</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoGrade"
                    checked={form.watch("autoGrade")}
                    onCheckedChange={(checked) => form.setValue("autoGrade", !!checked)}
                  />
                  <Label htmlFor="autoGrade">Auto-grade submissions</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Add MCQ and coding questions to your assignment</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={addMCQQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add MCQ
                </Button>
                <Button type="button" variant="outline" onClick={addCodingQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Coding
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions added yet. Click "Add MCQ" or "Add Coding" to start.
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, questionIndex) => (
                  <Card key={question.id} className="border-2">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant={question.type === "mcq" ? "default" : "secondary"}>
                            {question.type === "mcq" ? "Multiple Choice" : "Coding Problem"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Question {questionIndex + 1}</span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeQuestion(questionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Label>Question Title</Label>
                          <Input
                            {...form.register(`questions.${questionIndex}.title`)}
                            placeholder="Enter question title"
                          />
                        </div>
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min="1"
                            {...form.register(`questions.${questionIndex}.points`, { valueAsNumber: true })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Question Description</Label>
                        <Textarea
                          {...form.register(`questions.${questionIndex}.description`)}
                          placeholder="Enter question description"
                          rows={3}
                        />
                      </div>

                      {question.type === "mcq" && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label>Answer Options</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOptionToQuestion(questionIndex)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {question.options?.map((option, optionIndex) => (
                              <div key={option.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={option.isCorrect}
                                  onCheckedChange={() => setCorrectOption(questionIndex, optionIndex)}
                                />
                                <Input
                                  {...form.register(`questions.${questionIndex}.options.${optionIndex}.text`)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="flex-1"
                                />
                                {question.options && question.options.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeOptionFromQuestion(questionIndex, optionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.type === "coding" && (
                        <div className="space-y-4">
                          <div>
                            <Label>Problem Statement</Label>
                            <Textarea
                              {...form.register(`questions.${questionIndex}.problemStatement`)}
                              placeholder="Describe the coding problem in detail"
                              rows={4}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Input Format</Label>
                              <Textarea
                                {...form.register(`questions.${questionIndex}.inputFormat`)}
                                placeholder="Describe the input format"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Output Format</Label>
                              <Textarea
                                {...form.register(`questions.${questionIndex}.outputFormat`)}
                                placeholder="Describe the expected output format"
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Time Limit (ms)</Label>
                              <Input
                                type="number"
                                {...form.register(`questions.${questionIndex}.timeLimit`, { valueAsNumber: true })}
                                placeholder="1000"
                              />
                            </div>
                            <div>
                              <Label>Memory Limit (MB)</Label>
                              <Input
                                type="number"
                                {...form.register(`questions.${questionIndex}.memoryLimit`, { valueAsNumber: true })}
                                placeholder="256"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/assignments")}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createAssignmentMutation.isPending || questions.length === 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
          </Button>
        </div>
      </form>
    </div>
  );
}