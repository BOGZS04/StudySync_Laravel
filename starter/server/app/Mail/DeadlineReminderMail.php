<?php

namespace App\Mail;

use App\Models\Assignment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DeadlineReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $student, public Assignment $assignment)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Deadline reminder: {$this->assignment->title}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.deadline-reminder');
    }
}
