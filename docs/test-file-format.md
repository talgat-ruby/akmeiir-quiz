# Question set file format

The app imports question sets from one format: a **UTF-8 JSON file**. Tests in other formats (for
example MyTestX `.mtx`) must be converted to it first.

```json
{
	"title": "ОФД — pharmacy",
	"description": "Optional text shown on the test page.",
	"questions": [
		{
			"text": "Which planet is known as the Red Planet?",
			"answers": [{ "text": "Venus" }, { "text": "Mars", "correct": true }, { "text": "Jupiter" }]
		},
		{
			"text": "Which of these are primary colors of light?",
			"answers": [
				{ "text": "Red", "correct": true },
				{ "text": "Green", "correct": true },
				{ "text": "Yellow" }
			]
		}
	]
}
```

## Rules

| Field                           | Required | Notes                                                     |
| ------------------------------- | -------- | --------------------------------------------------------- |
| `title`                         | yes      | Non-empty text.                                           |
| `description`                   | no       | Text; may be empty.                                       |
| `questions`                     | yes      | At least 1 question, asked in this order when not random. |
| `questions[].text`              | yes      | Non-empty text.                                           |
| `questions[].answers`           | yes      | At least 2 answers, at least 1 of them correct.           |
| `questions[].answers[].text`    | yes      | Non-empty text.                                           |
| `questions[].answers[].correct` | no       | `true` or `false`; defaults to `false`.                   |

- A question with **more than one** correct answer becomes "select all that apply" and is scored
  all-or-nothing.
- Texts are trimmed. Answer order in the file doesn't matter: answers are shuffled for every attempt.
- **No other fields are allowed.** A misspelled field (e.g. `"corect"`) is reported as an error
  instead of being silently ignored.
- If a file has problems, the upload lists them with their locations, e.g.
  `question 5 › answer 1 › corect: unknown field`. Within one object only the first unknown field
  is reported, so a file with several extra fields may need a few rounds.

## Uploading

Admins upload on **Tests → Upload a question set**: drop the file on the page or choose it, up to
5 MB. A file that passes appears in the test list for everyone. Tests can't be deleted in the app.
