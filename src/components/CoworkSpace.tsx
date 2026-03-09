import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { CheckCircle2, Circle, Loader2, ArrowLeft, Sparkles, Upload, Link as LinkIcon, Plus, ChevronDown, ChevronRight, User, Bot, Send, FileText, GripVertical, Edit2 } from "lucide-react";
import Markdown from "react-markdown";
import { dashboardData } from "@/src/data";
import { cn } from "@/src/lib/utils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type SectionContent = {
  questions: string[];
  findings: string[];
  assumptions: string[];
  questionsToAnswer: string[];
  dataReferenced: string[];
};

type Interaction = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Task = {
  id: string;
  title: string;
  action: string;
  dataSources: string[];
  status: 'pending' | 'active' | 'done';
  content?: SectionContent;
  interactions: Interaction[];
  notes?: string;
  previousFindings?: string[];
  enabled: boolean;
};

function StructuredContentDisplay({ content, onAddQuestionAsTask }: { content: SectionContent, onAddQuestionAsTask?: (q: string, findings: string[]) => void }) {
  const [showQuestionsToAnswer, setShowQuestionsToAnswer] = useState(false);

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed space-y-3">
      {content.questions.length > 0 && (
        <div>
          <span className="font-semibold">1. Questions: </span>
          {content.questions.join(" ")}
        </div>
      )}
      
      {content.findings.length > 0 && (
        <div>
          <span className="font-semibold">2. Findings (Verified): </span>
          {content.findings.join(" ")}
        </div>
      )}

      {content.assumptions.length > 0 && (
        <div>
          <span className="font-semibold">3. Assumptions: </span>
          {content.assumptions.join(" ")}
        </div>
      )}

      {content.questionsToAnswer.length > 0 && (
        <div>
          <button 
            onClick={() => setShowQuestionsToAnswer(!showQuestionsToAnswer)}
            className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition-colors"
          >
            {showQuestionsToAnswer ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            4. Questions to answer
          </button>
          {showQuestionsToAnswer && (
            <div className="mt-2 pl-5 space-y-2">
              {content.questionsToAnswer.map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-4 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <span>{q}</span>
                  {onAddQuestionAsTask && (
                    <button 
                      onClick={() => onAddQuestionAsTask(q, content.findings)}
                      className="shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Explore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {content.dataReferenced.length > 0 && (
        <div>
          <span className="font-semibold">5. Data / Apps Referenced: </span>
          {content.dataReferenced.join(", ")}
        </div>
      )}
    </div>
  );
}

export function CoworkSpace({ goal, onClose }: { goal: string; onClose: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<'planning' | 'analysing' | 'review'>('planning');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planPrompt, setPlanPrompt] = useState("");
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const generatePlan = async () => {
      setIsGeneratingPlan(true);
      try {
        const planResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-preview',
          contents: `Create an analysis plan for the goal: "${goal}". Context: ${dashboardData.contextForAI}. 
          Return 4-6 steps. For each step, provide:
          - id: unique string
          - title: short title of the step
          - action: description of what will be analyzed
          - dataSources: array of strings (e.g., ["Stripe", "HubSpot", "Q1 Financials"])`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  dataSources: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "title", "action", "dataSources"]
              }
            }
          }
        });

        if (!isMounted) return;

        const planText = planResponse.text || "[]";
        const generatedTasks: Task[] = JSON.parse(planText).map((t: any) => ({ 
          ...t, 
          status: 'pending',
          interactions: [],
          enabled: true,
          dataSources: t.dataSources || []
        }));
        setTasks(generatedTasks);
      } catch (error) {
        console.error("Cowork error:", error);
      } finally {
        if (isMounted) setIsGeneratingPlan(false);
      }
    };

    generatePlan();
    return () => { isMounted = false; };
  }, [goal]);

  const handleRefinePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planPrompt.trim() || isRefiningPlan) return;
    
    setIsRefiningPlan(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: `Current analysis plan for the goal "${goal}":
        ${JSON.stringify(tasks, null, 2)}
        
        User request to modify the plan: "${planPrompt}"
        
        Return the updated list of steps (4-6 steps usually). Keep the same JSON structure.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                action: { type: Type.STRING },
                dataSources: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "title", "action", "dataSources"]
            }
          }
        }
      });
      
      const planText = response.text || "[]";
      const generatedTasks: Task[] = JSON.parse(planText).map((t: any) => ({ 
        ...t, 
        status: 'pending',
        interactions: [],
        enabled: true,
        dataSources: t.dataSources || []
      }));
      setTasks(generatedTasks);
      setPlanPrompt("");
    } catch (error) {
      console.error("Refine plan error:", error);
    } finally {
      setIsRefiningPlan(false);
    }
  };

  const generateTaskContent = async (taskId: string, currentTasks: Task[]) => {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || task.content || task.status === 'active') return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'active' } : t));

    try {
      const prompt = `
        You are an AI data analyst. We are working on the task: "${task.title} - ${task.action}".
        Overall Goal: ${goal}
        Dashboard Context: ${dashboardData.contextForAI}
        
        ${task.previousFindings && task.previousFindings.length > 0 ? `Previous Findings Context:\n${task.previousFindings.join('\n')}` : ''}
        
        Generate the initial analysis content for this section.
        Format requirements:
        - questions: Array of strings (the questions being asked)
        - findings: Array of strings (verified findings)
        - assumptions: Array of strings (assumptions made)
        - questionsToAnswer: Array of strings (follow-up questions)
        - dataReferenced: Array of strings (data sources/apps)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              questionsToAnswer: { type: Type.ARRAY, items: { type: Type.STRING } },
              dataReferenced: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["questions", "findings", "assumptions", "questionsToAnswer", "dataReferenced"]
          }
        }
      });

      const responseData = JSON.parse(response.text || "{}");
      
      const newContent: SectionContent = {
        questions: responseData.questions || [],
        findings: responseData.findings || [],
        assumptions: responseData.assumptions || [],
        questionsToAnswer: responseData.questionsToAnswer || [],
        dataReferenced: responseData.dataReferenced || []
      };

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              content: newContent,
              status: 'done'
            } 
          : t
      ));
    } catch (error) {
      console.error("Task content generation error:", error);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' } : t));
    }
  };

  const handleApprovePlan = () => {
    const activeTasks = tasks.filter(t => t.enabled);
    setTasks(activeTasks);
    if (activeTasks.length > 0) {
      setActiveTaskId(activeTasks[0].id);
      setWorkflowState('analysing');
      generateTaskContent(activeTasks[0].id, activeTasks);
    }
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (workflowState === 'analysing') {
      scrollToBottom();
    }
  }, [activeTask?.interactions, isProcessingTask, workflowState]);

  const handlePromptTask = async (e?: React.FormEvent, attachmentContext: string = "") => {
    if (e) e.preventDefault();
    if (!activeTask || isProcessingTask) return;
    
    const promptText = input.trim();
    if (!promptText && !attachmentContext) return;

    const userInteraction: Interaction = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText + (attachmentContext ? `\n\n[Attached: ${attachmentContext}]` : "")
    };

    setTasks(prev => prev.map(t => 
      t.id === activeTaskId 
        ? { ...t, interactions: [...t.interactions, userInteraction], status: 'active' } 
        : t
    ));
    setInput("");
    setIsProcessingTask(true);

    try {
      const chatHistory = activeTask.interactions.map(i => `${i.role}: ${i.content}`).join("\n");
      const previousContent = activeTask.content ? JSON.stringify(activeTask.content) : "None";

      const prompt = `
        You are an AI data analyst. We are working on the task: "${activeTask.title} - ${activeTask.action}".
        Overall Goal: ${goal}
        Dashboard Context: ${dashboardData.contextForAI}
        
        ${activeTask.previousFindings && activeTask.previousFindings.length > 0 ? `Previous Findings Context:\n${activeTask.previousFindings.join('\n')}` : ''}
        
        Previous Section Content: ${previousContent}
        
        Chat History:
        ${chatHistory}
        User: ${userInteraction.content}
        
        Analyze the request and provide an updated structured output for this section, along with a conversational message.
        Make sure to populate the structured output with rich, detailed data based on the context and user request.
        Format requirements:
        - questions: Array of strings (the questions being asked)
        - findings: Array of strings (verified findings)
        - assumptions: Array of strings (assumptions made)
        - questionsToAnswer: Array of strings (follow-up questions)
        - dataReferenced: Array of strings (data sources/apps)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              questionsToAnswer: { type: Type.ARRAY, items: { type: Type.STRING } },
              dataReferenced: { type: Type.ARRAY, items: { type: Type.STRING } },
              message: { type: Type.STRING }
            },
            required: ["questions", "findings", "assumptions", "questionsToAnswer", "dataReferenced", "message"]
          }
        }
      });

      const responseData = JSON.parse(response.text || "{}");
      
      const aiInteraction: Interaction = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData.message || "I have updated the section."
      };

      const newContent: SectionContent = {
        questions: responseData.questions || [],
        findings: responseData.findings || [],
        assumptions: responseData.assumptions || [],
        questionsToAnswer: responseData.questionsToAnswer || [],
        dataReferenced: responseData.dataReferenced || []
      };

      setTasks(prev => prev.map(t => 
        t.id === activeTaskId 
          ? { 
              ...t, 
              interactions: [...t.interactions, aiInteraction],
              content: newContent,
              status: 'done'
            } 
          : t
      ));
    } catch (error) {
      console.error("Task processing error:", error);
      const errorInteraction: Interaction = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error processing that request."
      };
      setTasks(prev => prev.map(t => 
        t.id === activeTaskId 
          ? { ...t, interactions: [...t.interactions, errorInteraction] } 
          : t
      ));
    } finally {
      setIsProcessingTask(false);
    }
  };

  const handleAddQuestionAsTask = (question: string, previousFindings: string[]) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: "Investigate: " + question.substring(0, 30) + (question.length > 30 ? "..." : ""),
      action: question,
      dataSources: [],
      status: 'pending',
      interactions: [],
      previousFindings: previousFindings,
      enabled: true
    };
    setTasks(prev => [...prev, newTask]);
    setActiveTaskId(newTask.id);
    
    setTimeout(() => {
      document.getElementById(`task-${newTask.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleUpdateNote = (taskId: string, note: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes: note } : t));
  };

  if (workflowState === 'planning') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-red-500" />
            <h1 className="text-xl font-bold text-slate-900">AI Analyst</h1>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Draft Plan</span>
            <div className="ml-auto bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded">Draft</div>
          </div>

          {/* Goal */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-3 text-slate-600 italic">
            <LinkIcon className="w-4 h-4 text-slate-400" />
            {goal}
          </div>

          {/* Summary */}
          <div className="text-sm text-slate-500 mb-4 font-medium">
            {tasks.filter(t => t.enabled).length} Steps · ~{tasks.filter(t => t.enabled).length * 2} min · {Array.from(new Set(tasks.flatMap(t => t.dataSources))).length} data sources
          </div>

          {/* Steps List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            {isGeneratingPlan || isRefiningPlan ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p>{isRefiningPlan ? "Refining plan..." : "Generating analysis plan..."}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task, index) => (
                  <div key={task.id} className={cn("p-4 flex gap-4 transition-opacity", !task.enabled && "opacity-50")}>
                    <div className="flex flex-col items-center gap-2 pt-1 cursor-grab">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{task.title}</h3>
                        <Edit2 className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{task.action}</p>
                      <div className="flex flex-wrap gap-2">
                        {task.dataSources?.map(ds => (
                          <span key={ds} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600">
                            {ds}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      <button 
                        onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, enabled: !t.enabled } : t))}
                        className={cn(
                          "w-10 h-6 rounded-full transition-colors relative",
                          task.enabled ? "bg-slate-900" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          task.enabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isGeneratingPlan && !isRefiningPlan && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                <button className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add custom step
                </button>
              </div>
            )}
          </div>

          {/* Refine Plan Input */}
          {!isGeneratingPlan && !isRefiningPlan && (
            <form onSubmit={handleRefinePlan} className="mb-8 relative">
              <input
                type="text"
                value={planPrompt}
                onChange={(e) => setPlanPrompt(e.target.value)}
                placeholder="Prompt to change plan UI (e.g., 'Add a step to analyze marketing spend')"
                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
              />
              <button
                type="submit"
                disabled={!planPrompt.trim()}
                className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-colors bg-slate-100 rounded-lg"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Bottom Actions */}
          <div className="mt-auto flex flex-col items-center gap-4">
            <button
              onClick={handleApprovePlan}
              disabled={isGeneratingPlan || isRefiningPlan || tasks.filter(t => t.enabled).length === 0}
              className="w-full max-w-md py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Approve Plan
            </button>
            <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">
              Back to Goal
            </button>
            <p className="text-xs text-slate-400">Steps execute sequentially. You can pause at any time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Co-work Analysis
            </h2>
            <p className="text-sm text-slate-500">Goal: {goal}</p>
          </div>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setWorkflowState('analysing')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              workflowState === 'analysing' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Analysing
          </button>
          <button
            onClick={() => setWorkflowState('review')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              workflowState === 'review' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Panel: Task Tree */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Analysis Plan</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {tasks.length === 0 && isGeneratingPlan && (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating plan...</span>
              </div>
            )}

            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "relative pl-6 cursor-pointer group",
                    activeTaskId === task.id ? "opacity-100" : "opacity-70 hover:opacity-100"
                  )}
                  onClick={() => {
                    setActiveTaskId(task.id);
                    setWorkflowState('analysing');
                    document.getElementById(`task-${task.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    if (!task.content && task.status === 'pending') {
                      generateTaskContent(task.id, tasks);
                    }
                  }}
                >
                  <div className="absolute -left-[11px] top-1 bg-white py-1">
                    {task.status === 'done' ? (
                      <CheckCircle2 className={cn("w-5 h-5 bg-white", activeTaskId === task.id ? "text-emerald-500" : "text-emerald-400")} />
                    ) : task.status === 'active' ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin bg-white" />
                    ) : (
                      <Circle className={cn("w-5 h-5 bg-white", activeTaskId === task.id ? "text-indigo-400" : "text-slate-300")} />
                    )}
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl border transition-all",
                    activeTaskId === task.id ? "border-indigo-200 bg-indigo-50/50" : "border-transparent hover:border-slate-200"
                  )}>
                    <h4 className={cn("text-sm font-medium", activeTaskId === task.id ? "text-indigo-900" : "text-slate-800")}>
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {workflowState === 'analysing' && tasks.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setWorkflowState('review')}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Move to Review
              </button>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          {workflowState === 'analysing' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth" id="analysis-container">
              {tasks.length > 0 ? tasks.map(task => (
                <div 
                  key={task.id} 
                  id={`task-${task.id}`} 
                  className={cn(
                    "scroll-mt-6 border rounded-xl overflow-hidden transition-all", 
                    activeTaskId === task.id ? "border-indigo-200 shadow-md ring-1 ring-indigo-500" : "border-slate-200 shadow-sm"
                  )}
                >
                  <div 
                    className="p-6 border-b border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" 
                    onClick={() => setActiveTaskId(task.id)}
                  >
                    <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{task.action}</p>
                  </div>
                  
                  <div className="p-6 space-y-8 bg-white">
                    {task.content ? (
                      <StructuredContentDisplay 
                        content={task.content} 
                        onAddQuestionAsTask={handleAddQuestionAsTask} 
                      />
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm italic text-center">
                        Generating content...
                      </div>
                    )}

                    {task.interactions.length > 0 && (
                      <div className="space-y-4">
                        {task.interactions.map((msg) => (
                          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              msg.role === "user" ? "bg-slate-900 text-white" : "bg-indigo-100 text-indigo-600"
                            )}>
                              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                              msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                            )}>
                              {msg.role === "assistant" ? (
                                <div className="markdown-body prose prose-sm max-w-none prose-slate">
                                  <Markdown>{msg.content}</Markdown>
                                </div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        ))}
                        {isProcessingTask && activeTaskId === task.id && (
                          <div className="flex gap-3 flex-row">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            </div>
                          </div>
                        )}
                        <div ref={activeTaskId === task.id ? messagesEndRef : null} />
                      </div>
                    )}
                  </div>

                  {activeTaskId === task.id && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                      <div className="flex gap-2 mb-3">
                        <button 
                          onClick={(e) => handlePromptTask(e, "Uploaded Data: Q1_Financials.csv")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Data
                        </button>
                        <button 
                          onClick={(e) => handlePromptTask(e, "Connected App: Hubspot CRM")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> Connect App
                        </button>
                      </div>
                      <form onSubmit={handlePromptTask} className="relative flex items-center">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Prompt to find data or analyze..."
                          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
                          disabled={isProcessingTask}
                        />
                        <button
                          type="submit"
                          disabled={!input.trim() || isProcessingTask}
                          className="absolute right-2 p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 h-full min-h-[400px]">
                  {isGeneratingPlan ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Generating analysis plan...</span>
                    </div>
                  ) : (
                    "No tasks available."
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <div className="max-w-3xl mx-auto space-y-12">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Review & Annotate</h2>
                  <p className="text-slate-500">Review the findings for each section and add your notes.</p>
                </div>
                
                {tasks.map((task, index) => (
                  <div key={task.id} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                    </div>
                    
                    {task.content ? (
                      <StructuredContentDisplay content={task.content} />
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm italic text-center">
                        No structured content generated for this section yet.
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Your Notes</label>
                      <textarea
                        value={task.notes || ""}
                        onChange={(e) => handleUpdateNote(task.id, e.target.value)}
                        placeholder="Add your insights, action items, or comments here..."
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm min-h-[100px] resize-y shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

