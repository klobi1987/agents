# 🤖 Claude Skills - Global Installation Guide

Ovaj dokument objašnjava kako su Claude Code Skills globalno instalirani i kako ih koristiti sa ovim projektom.

---

## ✅ Instalirani Skills (Globalno)

Sledeći Claude Code skills su instalirani u `~/.config/claude/skills/` i dostupni su **za sve projekte**:

### 1. **python-backend-engineer** 🐍
**Autor:** [TheCookingSenpai](https://github.com/tcsenpai)

Senior Python Backend Engineer sa expertise-om u:
- FastAPI, Django, Flask development
- SQLAlchemy, Pydantic, asyncio
- uv dependency management
- Database schema design & optimization
- REST/GraphQL API development
- Authentication & security best practices
- pytest test suites
- Performance optimization & caching

**Use case za ovaj projekat:**
- Optimizacija Bybit API Python koda
- Refactoring `n8n-complete-trade-runner.py`
- Database integracija (ako dodaješ trade history tracking)
- Performance profiling break-even monitor-a

**Kako aktivirati:**
```
Pokreni Claude Code i reci: "Use python-backend-engineer to review my trade runner code"
```

---

### 2. **backend-typescript-architect** 📘
**Autor:** [TheCookingSenpai](https://github.com/tcsenpai)

Senior TypeScript/Bun Backend Architect:
- Bun runtime optimization
- API design & architecture
- Database optimization (Prisma, TypeORM)
- Server-side scalability
- Clean architecture patterns
- Error handling & logging
- Production-ready TypeScript

**Use case za ovaj projekat:**
- TypeScript verzija trade runner-a
- n8n custom nodes u TypeScript-u
- Migration sa Python na Bun (ako želiš bolje performance)

**Kako aktivirati:**
```
"Use backend-typescript-architect to create TypeScript version of trade executor"
```

---

### 3. **senior-code-reviewer** 🔍
**Autor:** [TheCookingSenpai](https://github.com/tcsenpai)

15+ godina experience fullstack code review:
- Security vulnerability analysis
- Performance bottleneck identification
- Architecture decision review
- Code quality assessment
- Best practices enforcement
- Actionable feedback sa priority levels

**Use case za ovaj projekat:**
- Security audit Bybit API key handling-a
- Review trade logic za edge cases
- Performance analysis break-even monitor-a
- Architecture review komplentog sistema

**Kako aktivirati:**
```
"Use senior-code-reviewer to audit my trading system for security issues"
```

---

### 4. **react-coder** ⚛️
**Autor:** [toyamarinyon](https://github.com/toyamarinyon)

React 19 expert sa "less is more" philosophy:
- Simple, maintainable komponente
- Minimal useEffect usage
- Modern React patterns
- "Inevitable code" pristup
- Component design koji je očigledan i prirodan

**Use case za ovaj projekat:**
- Trading dashboard komponente
- Real-time position monitoring UI
- Order management interface
- Performance metrics vizualizacije

**Kako aktivirati:**
```
"Use react-coder to create a trading dashboard component"
```

---

### 5. **ts-coder** 📜
**Autor:** [toyamarinyon](https://github.com/toyamarinyon)

TypeScript expert za "inevitable code":
- Kod gde svaka odluka deluje kao jedina moguća
- Cognitive effortlessness
- Simplicity over cleverness
- Clean, očigledan design

**Use case za ovaj projekat:**
- Refactoring JavaScript fajlova u TypeScript
- Type-safe Bybit API wrapper
- Strongly-typed order management system

**Kako aktivirati:**
```
"Use ts-coder to create type-safe wrapper for Bybit API"
```

---

### 6. **ui-engineer** 🎨
**Autor:** [TheCookingSenpai](https://github.com/tcsenpai)

Frontend specialist za moderne frameworks:
- JavaScript/TypeScript frameworks
- Responsive design
- Component-driven architecture
- Accessibility (a11y)
- Performance optimization
- Backend integration

**Use case za ovaj projekat:**
- Complete frontend dashboard development
- Responsive mobile trading interface
- Accessible UI komponente sa Kibo UI
- Integration sa Bybit WebSocket API za real-time updates

**Kako aktivirati:**
```
"Use ui-engineer to build responsive trading dashboard with real-time updates"
```

---

## 🚀 Kako Koristiti Skills

### Automatska Aktivacija
Claude Code automatski detektuje relevantne skills na osnovu konteksta. Jednostavno opisuj task normalno i Claude će koristiti odgovarajući skill.

### Eksplicitna Aktivacija
Možeš eksplicitno pozvati skill:

```bash
# Primer 1: Code review
"Use senior-code-reviewer to analyze break-even-monitor.py"

# Primer 2: Refactoring
"Use python-backend-engineer to optimize the Bybit API calls in trade runner"

# Primer 3: Frontend development
"Use react-coder to create a position monitoring dashboard"

# Primer 4: Architecture
"Use backend-typescript-architect to design a microservices architecture for trading system"
```

### Kombinovanje Skills
Možeš kombinovati više skills za complex tasks:

```bash
"Use senior-code-reviewer to audit the code, then use python-backend-engineer to implement the recommended fixes"
```

---

## 📂 Lokacija Skills

**Global Skills Directory:**
```
~/.config/claude/skills/
├── backend-typescript-architect/
│   └── SKILL.md
├── python-backend-engineer/
│   └── SKILL.md
├── react-coder/
│   └── SKILL.md
├── senior-code-reviewer/
│   └── SKILL.md
├── ts-coder/
│   └── SKILL.md
└── ui-engineer/
    └── SKILL.md
```

**Kako dodati nove skills:**
```bash
mkdir -p ~/.config/claude/skills/my-custom-skill
# Kreiraj SKILL.md sa YAML frontmatter
```

---

## 🔄 Update Skills

Ako želiš da update-uješ skills na latest verziju:

```bash
cd /tmp
git clone https://github.com/hesreallyhim/a-list-of-claude-code-agents.git
cd a-list-of-claude-code-agents/agents

# Update postojećih skills
for agent in *.md; do
  name=$(basename "$agent" .md)
  cp "$agent" ~/.config/claude/skills/"$name"/SKILL.md
  echo "✅ Updated: $name"
done
```

---

## 🌐 Dodatni Resources

### Agent Frameworks (Opciono)

Ako želiš još naprednije AI orchestration:

1. **[Code By Agents](https://github.com/baryhuang/code-by-agents)** - Framework za koordinaciju multiple agents
2. **[EquilateralAgents Open Core](https://github.com/Equilateral-AI/equilateral-agents-open-core)** - 22 self-learning agents sa memory tracking
3. **[Claude Code Subagents Collection](https://github.com/wshobson/agents)** - Ekstenzivna kolekcija dodatnih agents

### Community Lists

- **[awesome-claude-agents](https://github.com/rahulvrane/awesome-claude-agents)** - Dodatna kolekcija agents
- **[Awesome Claude Skills](https://github.com/travisvn/awesome-claude-skills)** - Official skills marketplace

---

## 💡 Best Practices

### 1. **Specifičnost**
Budi specifičan kada pozivas skill:
```
❌ "Review my code"
✅ "Use senior-code-reviewer to check for security vulnerabilities in API key handling"
```

### 2. **Kontekst**
Daj dovoljan context:
```
✅ "Use python-backend-engineer to refactor the break-even monitor.
    Current issue: It's making too many API calls (15/30s).
    Goal: Reduce to <5 calls per cycle while maintaining accuracy."
```

### 3. **Iterativnost**
Koristi skills iterativno:
```
Step 1: "Use senior-code-reviewer to identify performance issues"
Step 2: "Use python-backend-engineer to implement the top 3 recommendations"
Step 3: "Use senior-code-reviewer to verify the fixes"
```

### 4. **Kombinovanje sa Tools**
Skills rade sa Claude Code tools (Read, Edit, Bash, etc.):
```
"Use python-backend-engineer to:
1. Read the current trade-runner code
2. Identify optimization opportunities
3. Edit the file with improvements
4. Run tests to verify changes"
```

---

## 🎯 Recommended Workflows za Ovaj Projekat

### Workflow 1: Security Audit
```bash
1. Use senior-code-reviewer → Identify security issues
2. Use python-backend-engineer → Fix vulnerabilities
3. Use senior-code-reviewer → Verify fixes
```

### Workflow 2: Performance Optimization
```bash
1. Use python-backend-engineer → Profile API calls
2. Use senior-code-reviewer → Review optimization approach
3. Use python-backend-engineer → Implement caching/batching
```

### Workflow 3: TypeScript Migration
```bash
1. Use ts-coder → Create type definitions for Bybit API
2. Use backend-typescript-architect → Design TS architecture
3. Use ts-coder → Implement type-safe trade runner
```

### Workflow 4: Dashboard Development
```bash
1. Use ui-engineer → Design component architecture
2. Use react-coder → Implement React components
3. Use ts-coder → Add TypeScript types
4. Use ui-engineer → Optimize performance & accessibility
```

---

## 🐛 Troubleshooting

**Skills se ne pojavljuju:**
- Proveri da je folder `~/.config/claude/skills/` ispravan
- Verifikuj da svaki skill ima `SKILL.md` fajl sa YAML frontmatter
- Restartuj Claude Code session

**Skills se ne aktiviraju:**
- Pokušaj eksplicitno: `"Use <skill-name> to ..."`
- Proveri da je description u YAML-u dovoljno detaljan

**Konfuzija između skills:**
- Budi eksplicitan koji skill želiš
- Dodaj kontekst da Claude zna koji je relevantan

---

## 📚 Learn More

- [Claude Skills Documentation](https://docs.anthropic.com/en/docs/build-with-claude/agent-skills)
- [A List of Claude Code Agents](https://github.com/hesreallyhim/a-list-of-claude-code-agents) - Source repository
- [Awesome Claude Skills](https://github.com/travisvn/awesome-claude-skills) - Comprehensive skills list

---

## ✅ Quick Verification

Proveri da li su skills dostupni:

```bash
ls -1 ~/.config/claude/skills/
```

Expected output:
```
backend-typescript-architect
python-backend-engineer
react-coder
senior-code-reviewer
ts-coder
ui-engineer
```

---

**Status:** ✅ All 6 skills successfully installed globally!

**Last Updated:** 2025-11-08
