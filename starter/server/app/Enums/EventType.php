<?php

namespace App\Enums;

enum EventType: string
{
    case EXAM = 'exam';
    case DEADLINE = 'deadline';
    case PERSONAL = 'personal';
    case REMINDER = 'reminder';
}
