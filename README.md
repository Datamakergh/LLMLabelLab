# LLM Label Lab

A single-file training simulator for the Datamaker × International Trade Centre-Kenya data annotation programme (Day 7, Generative AI).

Trainees combine answer pieces in the lab on the left and watch a simulated model change on the right. The model is scripted, not a real AI.

Open `index.html` in a browser. No build step. Works on GitHub Pages.

## Class mode (Supabase)

Trainees join with a name, can tap "Ask the trainer", and the trainer sees everyone live, can pause the class and send everyone to a task.

1. Create a Supabase project.
2. Open `supabase/setup.sql`, replace `TRAINER-PIN-HERE` with your PIN, and run it in the SQL Editor.
3. Put your Project URL and anon key in the `SUPA` object in `index.html`.
4. Deploy (Vercel imports this repo directly). The trainer presses Class, then "Trainer? Enter your PIN".

Without Supabase the page still works on its own; the Class button just stays hidden.

### Trainee accounts (Trainee-001 to Trainee-040)

Run `supabase/setup2.sql` after `setup.sql`. It creates 40 accounts, each with a personal code. The trainer opens Class, enters the PIN, and presses "Login codes" to download or copy the list. Trainees sign in with their account and code; progress is saved per account and survives a refresh or a different device.
