<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MorningDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $student, public array $items)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your StudySync morning digest');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.morning-digest');
    }
}
