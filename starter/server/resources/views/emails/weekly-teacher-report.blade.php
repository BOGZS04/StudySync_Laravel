<p>Hello {{ $teacher->name }},</p>
<p>Here is your weekly StudySync class report:</p>
<ul>
    @forelse ($report as $item)
        <li>{{ $item }}</li>
    @empty
        <li>No class activity was recorded this week.</li>
    @endforelse
</ul>
