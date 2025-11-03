-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index for tool embeddings
CREATE INDEX IF NOT EXISTS idx_tools_embedding ON tools USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create other indexes
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active, type);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool ON agent_tools(tool_id);

-- Seed with 5 starter tools for testing
INSERT INTO tools (name, type, description, config, embedding) VALUES
('Web Search', 'langchain', 'Search the internet for information using Tavily API', '{"provider": "tavily", "max_results": 5}', NULL),
('Calculator', 'instruction_set', 'Perform mathematical calculations and evaluate expressions', '{"instructions": "Evaluate mathematical expressions using Python eval() safely"}', NULL),
('Image Generator', 'rest', 'Generate images from text descriptions using DALL-E', '{"endpoint": "https://api.openai.com/v1/images/generations", "model": "dall-e-3"}', NULL),
('Video Editor', 'internal', 'Edit videos on the timeline with OpenCut', '{"tool": "opencut", "operations": ["cut", "trim", "merge", "effects"]}', NULL),
('Code Executor', 'instruction_set', 'Execute Python code safely in a sandboxed environment', '{"sandbox": true, "timeout": 30, "max_memory_mb": 256}', NULL)
ON CONFLICT (name) DO NOTHING;
