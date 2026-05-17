<p>Hello {{ $student->name }},</p>
<p>Your assignment <strong>{{ $assignment->title }}</strong> is due on {{ $assignment->due_date->toDayDateTimeString() }}.</p>
<p>Open StudySync and protect a focused study block before the deadline.</p>
