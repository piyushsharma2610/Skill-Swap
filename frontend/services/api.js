// src/services/api.js

// Mock delay helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Local mock "database"
let mockMarket = [
  {
    id: 1,
    title: "Web Development",
    category: "Programming",
    availability: "Weekends",
    description: "I can teach you how to build websites using HTML, CSS, and JavaScript.",
    owner: "Alice",
  },
  {
    id: 2,
    title: "Guitar Lessons",
    category: "Music",
    availability: "Evenings",
    description: "Learn to play acoustic guitar from scratch.",
    owner: "Bob",
  },
];

// 🟢 Get user summary
export async function getSummary() {
  await delay(300);
  return {
    username: "Piyush",
    last_active_skill: "React Basics",
    totals: { completed: 3, in_progress: 2 },
    ai_suggestion: "Try learning Node.js to expand your full-stack skills!",
  };
}

// 🟢 Get skills marketplace
export async function getMarketSkills() {
  await delay(300);
  return mockMarket;
}

// 🟢 Add a new skill
export async function addSkill(skill) {
  const newSkill = { id: Date.now(), ...skill, owner: "You" };
  mockMarket.push(newSkill);
  return newSkill;
}

// 🟢 Get skills (for your dashboard list)
export async function getSkills() {
  try {
    const res = await fetch("http://127.0.0.1:8000/skills"); // backend call
    if (!res.ok) throw new Error("Failed to fetch skills");
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Falling back to mock getSkills:", err.message);
    return { skills: mockMarket };
  }
}

// 🟢 Request exchange
export async function requestExchange(skillId, message) {
  await delay(300);
  console.log(`📩 Exchange request for skill ${skillId}: ${message}`);
  return { success: true };
}
