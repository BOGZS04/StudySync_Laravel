<?php

use App\Http\Controllers\API\v1\AuthenticationController;
use App\Http\Controllers\API\v1\AIController;
use App\Http\Controllers\API\v1\AnnouncementController;
use App\Http\Controllers\API\v1\AssignmentController;
use App\Http\Controllers\API\v1\ClassController;
use App\Http\Controllers\API\v1\EventController;
use App\Http\Controllers\API\v1\MessageController;
use App\Http\Controllers\API\v1\NotificationController;
use App\Http\Controllers\API\v1\StudyScheduleController;
use App\Http\Controllers\API\v1\SubmissionController;
use App\Http\Controllers\API\v1\UserController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthenticationController::class, 'login'])->middleware('throttle:5,1');
Route::post('auth/register', [AuthenticationController::class, 'register'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('user/auth/me', [AuthenticationController::class, 'me']);
    Route::post('auth/logout', [AuthenticationController::class, 'logout']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('notifications/read', [NotificationController::class, 'clearRead']);
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);

    // Shared Academic Read Endpoints
    Route::get('classes', [ClassController::class, 'index']);
    Route::get('classes/{id}', [ClassController::class, 'show']);
    Route::get('assignments', [AssignmentController::class, 'index']);
    Route::get('assignments/{id}', [AssignmentController::class, 'show']);
    Route::get('classes/{classId}/assignments', [AssignmentController::class, 'byClass']);
    Route::get('announcements', [AnnouncementController::class, 'index']);
    Route::get('messages/conversations', [MessageController::class, 'conversations']);
    Route::get('messages/contacts', [MessageController::class, 'contacts']);
    Route::get('messages/{userId}', [MessageController::class, 'thread']);
    Route::post('messages', [MessageController::class, 'send']);
    Route::get('submissions/{id}/download', [SubmissionController::class, 'download'])
        ->middleware('signed')
        ->name('api.submissions.download');

    // Student Only
    Route::middleware('role:student')->group(function () {
        Route::apiResource('study-schedules', StudyScheduleController::class);
        Route::apiResource('events', EventController::class);
        Route::post('classes/join', [ClassController::class, 'join']);
        Route::post('assignments/{id}/submissions', [SubmissionController::class, 'store']);
        Route::get('student/submissions', [SubmissionController::class, 'mySubmissions']);
        Route::post('ai/study-suggestions', [AIController::class, 'studySuggestions']);
    });

    // Teacher Only
    Route::middleware('role:teacher')->group(function () {
        Route::post('classes', [ClassController::class, 'store']);
        Route::put('classes/{id}', [ClassController::class, 'update']);
        Route::patch('classes/{id}', [ClassController::class, 'update']);
        Route::delete('classes/{id}', [ClassController::class, 'destroy']);
        Route::get('classes/{classId}/students', [ClassController::class, 'students']);
        Route::delete('classes/{classId}/students/{studentId}', [ClassController::class, 'removeStudent']);

        Route::post('assignments', [AssignmentController::class, 'store']);
        Route::put('assignments/{id}', [AssignmentController::class, 'update']);
        Route::patch('assignments/{id}', [AssignmentController::class, 'update']);
        Route::delete('assignments/{id}', [AssignmentController::class, 'destroy']);
        Route::get('assignments/{id}/submissions', [SubmissionController::class, 'index']);
        Route::put('submissions/{id}/review', [SubmissionController::class, 'review']);

        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::delete('announcements/{id}', [AnnouncementController::class, 'destroy']);
        Route::post('ai/progress-summary', [AIController::class, 'progressSummary']);
    });

    // Admin Only
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('users/{id}/restore', [UserController::class, 'restore']);
    });
});
