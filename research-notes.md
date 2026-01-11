## 1. Individual Team Member Research(1 week)

- Shubham: While others shipped features, he made sure they wouldn’t set the server on fire.

    **Technical Infrastrucure**

    - Researched and designed Supabase (PostgreSQL + Auth + RLS) to be GDPR-compliant.
    - Data residency, right-to-erasure, audit logging while  supporting system-level requirements such as role-based authorization.
    - Privilege isolation, and row-level security for multi-tenant workloads (targeting <50ms auth overhead per request)
    - Analyzed cloud hosting and blockchain node deployment strategies including containerized services (Docker).
    - Chain RPC reliability (99.9%+ uptime targets) to maintain both backend availability and continuous on-chain event indexing.
    - Benchmarked multiple chains for gas efficiency and throughput.
    - Comparing average transaction costs (e.g., Solana <$0.002, Polygon ~$0.01–$0.05, Ethereum L1 $1–$20+)
    - Research on TPS metrics to select infrastructure suitable for high-frequency automation workloads.

-----------------------------------------------------------------------------------------------------------------------------------------

- Utkarsh: He made sure the first impression matched the engineering depth.

    **Creativity for Zynthax**

    - His UI decisions were informed by industry findings that effective UX design can increase conversion rates by up to 200–400% and improve retention through intuitive layouts and responsive feedback loops.
    - By applying research-driven design principles and analytics, Utkarsh ensured the product’s interactions reduced user friction, which studies show is a key driver of long-term engagement and lower churn.
    - He iterated and validated UI patterns against real metrics such as task completion rates and responsiveness because usability research consistently links measurable design improvements to higher satisfaction and loyalty

------------------------------------------------------------------------------------------------------------------------------------------

- Jami: Structured market intelligence while defining who Zynthax is built for and how it scales.

    **Clarity in business research**

    - Studied crypto transaction volume and activity patterns to quantify where automation delivers real economic impact.
    - Evaluated multiple Web3 ecosystems and funding models before proposing Solana-aligned startup pathways.
    - Translated market needs into concrete product logic: spend computation, transaction persistence, and workflow outputs.
    - Treated strategy like engineering: measurable inputs, structured logic, and predictable outcomes.

---------------------------------------------------------------------------------------------------------------------------------------------

- Aditya:Thinks in systems breaking chaotic problems into workflows, security models, and infrastructure that actually scales.

    **Thinking in systems Research**

    - Used documented benchmarks and research findings to influence every core decision, from workflow orchestration to encrypted secret handling, ensuring the design reflects real world needs.
    - Built sandboxed, deterministic nodes and least-privilege OAuth connectors because stolen credentials dominate real attacks (88% in basic web app attacks).
    - Designed every connector as a security boundary (scoped tokens + rotation), aligned with OWASP’s #1 risk: Broken Access Control (318k+ occurrences; tested in 94% of apps)
    - Engineered low-code pipelines with strict validation + isolation, treating integrations as the primary blast-radius—exactly where breach data shows attackers win via credentials

------------------------------------------------------------------------------------------------------------------------------------------------

## 2.Group Research in initial Phase(1-3 days):

- Evaluated how strongly the industry needs Zynthax by mapping real automation gaps across crypto trading, DAOs, and on-chain operations.
- Compared multiple tech stack combinations to balance developer velocity, security, maintainability, and team-wide productivity.
- Defined a shared vision for where Zynthax should stand in the crypto automation ecosystem and what differentiates it from existing tools.
- Broke each question into dedicated discussion points and validated conclusions against real world scenarios and failure cases.
- Analyzed funding strategies and chain efficiency to identify sustainable paths for growth and low cost infrastructure.
- Modeled user acquisition channels and adoption drivers based on how crypto teams already discover and trust tooling.
- Agreed on concrete realworld success metrics (usage, reliability, automation accuracy, security incidents) to objectively measure product impact.

## Conclusion of group thinking:

-  Each of these questions was analyzed by team members within their core domains of expertise.
-  The outcomes reflected in their individual research and contributions.
-  This collaborative approach allowed us to distribute responsibility effectively, parallelize problem-solving, and apply specialized thinking where it mattered most.


