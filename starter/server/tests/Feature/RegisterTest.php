<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_account_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test Student',
            'email' => 'test.student@example.test',
            'role' => 'student',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'test.student@example.test')
            ->assertJsonPath('data.user.role', 'student');

        $this->assertTrue(User::where('email', 'test.student@example.test')->exists());
    }
}
