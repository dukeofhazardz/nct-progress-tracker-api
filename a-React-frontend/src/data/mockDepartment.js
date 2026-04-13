export const mockDepartments = [
  {
    id: 1,
    name: "Web Development",
    icon: "🌐",
    progress: 78,
    cohorts: 4,
    instructor: "Israel Olajide", // Main Lead
    instructors: [
      { id: 101, name: "Israel Olajide", role: "Senior Faculty", rating: 4.9, activeCohorts: 2 },
      { id: 102, name: "Sarah Connor", role: "Instructor", rating: 4.7, activeCohorts: 1 },
      { id: 103, name: "James Maxwell", role: "Junior Instructor", rating: 4.5, activeCohorts: 1 }
    ],
    activeBatches: [
      { id: "WD-001", name: "Batch A - Morning", progress: 85, status: "On Track" },
      { id: "WD-002", name: "Batch B - Evening", progress: 42, status: "Behind" }
    ]
  },
  {
    id: 2,
    name: "Data Science",
    icon: "📊",
    progress: 45,
    cohorts: 2,
    instructor: "Dr. Arinze",
    instructors: [
      { id: 201, name: "Dr. Arinze", role: "Lead Scientist", rating: 4.8, activeCohorts: 1 },
      { id: 202, name: "Samuel Edo", role: "Assistant Instructor", rating: 4.6, activeCohorts: 1 }
    ],
    activeBatches: [
      { id: "DS-001", name: "Analytics Pro", progress: 45, status: "On Track" }
    ]
  },
  {
    id: 3,
    name: "Cybersecurity",
    icon: "🛡️",
    progress: 92,
    cohorts: 3,
    instructor: "Bolanle Williams",
    instructors: [
      { id: 301, name: "Bolanle Williams", role: "Security Lead", rating: 5.0, activeCohorts: 2 },
      { id: 302, name: "Femi Ade", role: "Lab Tech", rating: 4.2, activeCohorts: 1 }
    ],
    activeBatches: [
      { id: "SEC-001", name: "Ethical Hacking v1", progress: 92, status: "On Track" }
    ]
  },
  {
    id: 4,
    name: "UI/UX Design",
    icon: "🎨",
    progress: 60,
    cohorts: 5,
    instructor: "Blessing Okafor",
    instructors: [
      { id: 401, name: "Blessing Okafor", role: "Creative Lead", rating: 4.9, activeCohorts: 3 }
    ],
    activeBatches: [
      { id: "UX-005", name: "Product Design Batch", progress: 60, status: "On Track" }
    ]
  },
  {
    id: 5,
    name: "Mobile App Dev",
    icon: "📱",
    progress: 30,
    cohorts: 2,
    instructor: "Chidi Obi",
    instructors: [
      { id: 501, name: "Chidi Obi", role: "Mobile Lead", rating: 4.7, activeCohorts: 2 }
    ],
    activeBatches: [
      { id: "MOB-002", name: "React Native Cohort", progress: 30, status: "Behind" }
    ]
  }
];