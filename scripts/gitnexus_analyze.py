import os
from openai import OpenAI

client = OpenAI()

def get_project_structure():
    structure = []
    for root, dirs, files in os.walk('src'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        level = root.replace('src', '').count(os.sep)
        indent = ' ' * 4 * level
        structure.append(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
                structure.append(f"{sub_indent}{f}")
    return "\n".join(structure[:200])

def analyze_with_opus():
    structure = get_project_structure()
    prompt = f"Perform a GitNexus-style system audit for Rentrix based on this structure:\n{structure}\nInclude: Architecture map, Good/Bad/Missing parts, Risk analysis, and Required fixes."
    
    try:
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=[{'role': 'user', 'content': prompt}]
        )
        report = response.choices[0].message.content
        print(report)
        
        os.makedirs("docs", exist_ok=True)
        with open("docs/system-audit-latest.md", 'w') as f:
            f.write(report)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_with_opus()
