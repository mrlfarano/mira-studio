import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ConfigEngine } from '../config/config-engine.js'
import type { LLMAdapter, CompanionMessage } from '../companion/types.js'
import { validateManifest } from '../skills/skill-runtime.js'
import type { SkillManifest } from '../skills/types.js'

const SKILL_CREATION_PROMPT = `You are a Mira Studio skill generator. Given a user's natural language description of a skill they want, generate a valid Mira skill manifest as YAML.

The manifest must have these fields:
- id: lowercase alphanumeric with hyphens (e.g. "my-custom-skill")
- name: human-readable display name
- version: semantic version (start with "1.0.0")
- description: short description
- author: the skill author name
- homepage: optional URL
- cornerstones: array of relevant cornerstones from: creativity-ideation, project-delivery-planning, vibe-code-building, observability-reiteration, self-improvement
- panels: array of objects with {type, title, defaultWidth, defaultHeight}
- agent_injections: array of objects with {trigger: "always"|"on_start"|"on_prompt", content: string}
- claude_md_additions: array of objects with {section, content}
- wizard_steps: array of objects with {id, prompt, inputType: "text"|"select"|"multi-select"|"confirm", options?, defaultValue?}
- keybindings: array of objects with {action, keys, description}
- permissions: array from: panels, kanban, journal, agent_context, build_journal, companion, config, workspace
- composes_with: array of skill IDs this skill enhances
- conflicts_with: array of skill IDs this skill cannot coexist with

Return ONLY valid YAML. No markdown, no code fences, no explanation.`

export class SkillCreator {
  constructor(
    private adapter: LLMAdapter,
    private configEngine: ConfigEngine,
  ) {}

  async createFromDescription(
    userDescription: string,
    authorName: string = 'mira-user',
  ): Promise<SkillManifest> {
    const messages: CompanionMessage[] = [
      { role: 'system', content: SKILL_CREATION_PROMPT },
      {
        role: 'user',
        content: `Create a Mira skill manifest for this description:\n\n${userDescription}\n\nAuthor: ${authorName}`,
      },
    ]

    let fullYaml = ''
    for await (const chunk of this.adapter.chat(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    })) {
      fullYaml += chunk
    }

    const cleaned = fullYaml
      .replace(/^```yaml?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    const parsed = yaml.load(cleaned, { schema: yaml.JSON_SCHEMA })

    const result = validateManifest(parsed)
    if (!result.valid) {
      throw new Error(
        `Generated manifest is invalid: ${result.errors.join('; ')}`,
      )
    }

    const manifest = parsed as SkillManifest
    return manifest
  }

  async createAndInstall(
    userDescription: string,
    authorName: string,
  ): Promise<{ manifest: SkillManifest; installed: boolean }> {
    const manifest = await this.createFromDescription(
      userDescription,
      authorName,
    )

    const skillsDir = path.join(
      this.configEngine.getConfigDir(),
      'skills',
      manifest.id,
    )
    await fs.mkdir(skillsDir, { recursive: true })

    const manifestPath = path.join(skillsDir, 'skill.yml')
    const manifestYaml = yaml.dump(manifest, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    })
    await fs.writeFile(manifestPath, manifestYaml, 'utf-8')

    return { manifest, installed: true }
  }
}
