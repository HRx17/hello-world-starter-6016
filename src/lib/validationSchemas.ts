import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
});

// Study plan schemas
export const studyPlanSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long").trim(),
  problem_statement: z.string().min(10, "Problem statement must be at least 10 characters").max(2000, "Problem statement is too long").trim(),
  solution_goal: z.string().min(10, "Solution goal must be at least 10 characters").max(2000, "Solution goal is too long").trim(),
});

// Interview session schema
export const interviewSessionSchema = z.object({
  participant_name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
  scheduled_at: z.string().optional(),
});

// Observation schema
export const observationSchema = z.object({
  observation_type: z.string().min(1, "Type is required"),
  content: z.string().min(5, "Content must be at least 5 characters").max(5000, "Content is too long").trim(),
  tags: z.array(z.string()).optional(),
});

// Persona schema
export const personaSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description is too long").trim(),
  goals: z.array(z.string().min(3, "Goal must be at least 3 characters").max(200, "Goal is too long")).optional(),
  pain_points: z.array(z.string().min(3, "Pain point must be at least 3 characters").max(200, "Pain point is too long")).optional(),
});

// Export types
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type StudyPlanFormData = z.infer<typeof studyPlanSchema>;
export type InterviewSessionFormData = z.infer<typeof interviewSessionSchema>;
export type ObservationFormData = z.infer<typeof observationSchema>;
export type PersonaFormData = z.infer<typeof personaSchema>;