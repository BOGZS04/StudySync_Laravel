<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('Password1!');

        User::create([
            'name' => 'Admin Rivera',
            'email' => 'admin@studysync.test',
            'phone' => '+639171110001',
            'role' => UserRole::ADMIN,
            'password' => $password,
        ]);

        $teachers = [
            ['name' => 'Mara Santos', 'email' => 'mara.santos@studysync.test', 'phone' => '+639171110002'],
            ['name' => 'Noel Garcia', 'email' => 'noel.garcia@studysync.test', 'phone' => '+639171110003'],
        ];

        foreach ($teachers as $teacher) {
            User::create([
                ...$teacher,
                'role' => UserRole::TEACHER,
                'password' => $password,
            ]);
        }

        $students = [
            ['name' => 'Alyssa Cruz', 'email' => 'alyssa.cruz@studysync.test', 'phone' => '+639171110004'],
            ['name' => 'Benjie Tan', 'email' => 'benjie.tan@studysync.test', 'phone' => '+639171110005'],
            ['name' => 'Carlo Reyes', 'email' => 'carlo.reyes@studysync.test', 'phone' => '+639171110006'],
            ['name' => 'Dana Lim', 'email' => 'dana.lim@studysync.test', 'phone' => '+639171110007'],
            ['name' => 'Erika Dizon', 'email' => 'erika.dizon@studysync.test', 'phone' => '+639171110008'],
        ];

        foreach ($students as $student) {
            User::create([
                ...$student,
                'role' => UserRole::STUDENT,
                'password' => $password,
            ]);
        }
    }
}
