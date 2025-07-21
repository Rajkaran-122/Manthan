// Gemini AI integration for emergency triage
export interface TriageResult {
  p_score: number; // Physical urgency (0-100)
  v_score: number; // Vulnerability score (0-100)
  summary: string; // AI-generated summary
}

export interface VulnerabilityProfile {
  sensoryImpaired: boolean;
  nonVerbal: boolean;
  mobilityImpaired: boolean;
  medicalConditions: string;
}

export async function performTriage(
  emergencyMessage: string,
  profile: VulnerabilityProfile
): Promise<TriageResult> {
  // For demo purposes, we'll simulate Gemini API with intelligent responses
  // In production, replace with actual Gemini API call
  
  const prompt = `
    You are an emergency triage AI. Analyze this SOS signal and return a JSON response.
    
    Emergency Message: "${emergencyMessage}"
    Vulnerability Profile:
    - Sensory Impaired: ${profile.sensoryImpaired}
    - Non-Verbal: ${profile.nonVerbal}
    - Mobility Impaired: ${profile.mobilityImpaired}
    - Medical Conditions: ${profile.medicalConditions}
    
    Return JSON with:
    - p_score (0-100): Physical urgency based on keywords and context
    - v_score (0-100): Vulnerability amplification due to profile
    - summary: One sentence describing the situation and recommended response priority
  `;

  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Intelligent scoring based on message content and profile
  let p_score = 30; // Base score
  let v_score = 0;

  // Analyze message for physical urgency keywords
  const urgentKeywords = ['trapped', 'injured', 'bleeding', 'can\'t move', 'help', 'emergency', 'hurt'];
  const criticalKeywords = ['dying', 'heart attack', 'stroke', 'severe', 'critical'];
  
  const messageLower = emergencyMessage.toLowerCase();
  
  urgentKeywords.forEach(keyword => {
    if (messageLower.includes(keyword)) p_score += 15;
  });
  
  criticalKeywords.forEach(keyword => {
    if (messageLower.includes(keyword)) p_score += 25;
  });

  // Cap physical score
  p_score = Math.min(p_score, 100);

  // Calculate vulnerability score
  if (profile.sensoryImpaired) v_score += 25;
  if (profile.nonVerbal) v_score += 30;
  if (profile.mobilityImpaired) v_score += 20;
  if (profile.medicalConditions.trim()) v_score += 15;

  // Generate appropriate summary
  let summary = "Standard emergency response required.";
  
  if (p_score > 70) {
    summary = "CRITICAL: Immediate medical intervention needed.";
  } else if (p_score > 50) {
    summary = "HIGH PRIORITY: Urgent rescue response required.";
  }
  
  if (v_score > 40) {
    summary += " Vulnerable individual - specialized assistance protocols recommended.";
  }

  return {
    p_score: Math.round(p_score),
    v_score: Math.round(v_score),
    summary
  };
}

// Fallback triage for demo purposes
export function getDemoTriageResult(): TriageResult {
  return {
    p_score: 75,
    v_score: 45,
    summary: "HIGH PRIORITY: Injured person with mobility constraints - immediate rescue response with accessibility support."
  };
}