<p>Hello {{ $student->name }},</p>
<p>Here is your StudySync digest for today:</p>
<ul>
    @forelse ($items as $item)
        <li>{{ $item }}</li>
    @empty
        <li>No urgent academic items today.</li>
    @endforelse
</ul>
