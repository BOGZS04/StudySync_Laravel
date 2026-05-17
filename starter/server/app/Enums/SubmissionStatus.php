<?php

namespace App\Enums;

enum SubmissionStatus: string
{
    case SUBMITTED = 'submitted';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case GRADED = 'graded';
}
