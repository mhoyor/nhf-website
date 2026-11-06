-- Real website content to start from: the stories written for the prototype, from published results and reports.
-- Safe to run once on a new database; editors take over in Admin → News.
begin;
insert into news_posts (slug, title, summary, body, tags, section, published_on, date_text, photo_url, photo_alt, photo_credit, photo_position,
                        hero_title, highlights, sources, status, featured)
values
('world-rankings', 'Where Nigeria stands in the FIH world rankings', 'The men are 35th in the world and 4th in Africa; the women are 38th; the men are 14th in Hockey5s.', 'As of 4 November 2026, Nigeria’s men are 35th in the FIH outdoor world rankings with 1,700.42 points, fourth among African nations after South Africa (13th), Egypt (17th) and Ghana (33rd).

The women are 38th with 1,311.22 points. In Hockey5s the men are 14th in the world and third in Africa, after Egypt and Kenya.

Teams exchange ranking points in every FIH-sanctioned match. How many points move depends on the result, the importance of the match and the gap between the two teams before it.', array['Rankings','Senior teams']::text[], 'Rankings', '2026-11-04'::date, null, null, null, null, '50% 50%', null, '[]'::jsonb, '[["FIH ranking page, men","https://www.fih.hockey/outdoor-rankings/nigeria-men-hockey-rankings-49"],["FIH ranking page, women","https://www.fih.hockey/outdoor-rankings/nigeria-women-hockey-rankings-49"],["FIH Hockey5s rankings","https://www.fih.hockey/hockey5s-rankings"],["AfHF rankings explainer","https://www.africahockey.org/fih-world-rankings-update-following-hockey-world-cup-2026/"]]'::jsonb, 'published', false),
('u18-double-bronze', 'Double bronze for Nigeria’s U18s at the first Hockey5s Youth Africa Cup', 'The girls beat Ghana 4–3 and the boys beat Uganda 15–2 in their bronze-medal matches in Nairobi.', 'Nigeria’s under-18 girls and boys both finished third at the first Hockey5s Youth Africa Cup, played at the Sikh Union Club in Nairobi from 6 to 8 August 2026.

The girls won three of their four round-robin matches, including a 7–4 win over the eventual champions South Africa, and then beat Ghana 4–3 for bronze. Ifeoluwa Olaitan was the tournament’s leading scorer with 14 goals.

The boys drew 7–7 with South Africa in the round robin and beat Uganda 15–2 in the third-place match. Captain and goalkeeper Emmanuel Yakubu was named goalkeeper of the tournament.

The tournament was Africa’s qualifier for the first FIH Youth Hockey5s World Cup, in December 2026. Only the top two teams in each event qualified.', array['U18','Hockey5s']::text[], 'Youth', '2026-08-08'::date, null, '/img/u18-team-bronze.jpg', 'U18 girls and boys with their bronze medals', 'Photo: National Sports Commission', '50% 50%', 'Double *bronze* in Nairobi', '[["U18 girls · bronze match","4–3 v Ghana"],["U18 boys · bronze match","15–2 v Uganda"]]'::jsonb, '[["FIH match system: girls’ event","https://tms.fih.ch/competitions/1937"],["FIH match system: boys’ event","https://tms.fih.ch/competitions/1936"],["BSN Sports","https://bsnsports.com.ng/post/U18-Youth-Africa-Cup--Nigeria-Hold-South-Africa-In-Thrilling-14-Goal-Thriller"],["Mozzart Sport report","https://www.mozzartsport.co.ke/other-sports/news/kenya-crowned-mens-hockey-youth-africa-cup-champions-as-women-also-qualify-for-world-cup/67936"]]'::jsonb, 'published', true),
('u18-girls-bronze', 'U18 girls beat Ghana 4–3 to take bronze', 'Three round-robin wins, including 7–4 over the champions South Africa, then a one-goal bronze-medal match in Nairobi.', 'Nigeria’s U18 girls finished third at the first Hockey5s Youth Africa Cup in Nairobi, beating Ghana 4–3 in the bronze-medal match on 8 August.

In the round robin they beat South Africa 7–4, Ghana 6–2 and Uganda 5–1, and lost 6–10 to Kenya. South Africa went on to win the title.

Ifeoluwa Olaitan finished as the leading scorer of the tournament with 14 goals.', array['U18 girls','Hockey5s']::text[], 'U18 girls', '2026-08-08'::date, null, '/img/u18-girls-action.jpg', 'U18 girls in action', 'Photo: National Sports Commission', '50% 50%', null, '[]'::jsonb, '[["FIH match system: girls’ event","https://tms.fih.ch/competitions/1937"],["Mozzart Sport report","https://www.mozzartsport.co.ke/other-sports/news/kenya-crowned-mens-hockey-youth-africa-cup-champions-as-women-also-qualify-for-world-cup/67936"]]'::jsonb, 'published', false),
('u18-boys-bronze', 'U18 boys hold South Africa, then finish with a 15–2 bronze', 'A 14-goal draw with South Africa in the round robin and a 15–2 win over Uganda in the third-place match.', 'Nigeria’s U18 boys drew 7–7 with South Africa at the Sikh Union Club in Nairobi, matching them goal for goal in one of the tournament’s highest-scoring matches.

They also beat Uganda 8–5 and lost 5–10 to Kenya, who went on to win the boys’ title.

In the third-place match the boys beat Uganda again, 15–2. Captain and goalkeeper Emmanuel Yakubu was named goalkeeper of the tournament.', array['U18 boys','Hockey5s']::text[], 'U18 boys', '2026-08-08'::date, null, '/img/u18-boys-action.jpg', 'U18 boys in action', 'Photo: National Sports Commission', '50% 50%', null, '[]'::jsonb, '[["BSN Sports: Nigeria hold South Africa","https://bsnsports.com.ng/post/U18-Youth-Africa-Cup--Nigeria-Hold-South-Africa-In-Thrilling-14-Goal-Thriller"],["FIH match system: boys’ event","https://tms.fih.ch/competitions/1936"],["Mozzart Sport report","https://www.mozzartsport.co.ke/other-sports/news/kenya-crowned-mens-hockey-youth-africa-cup-champions-as-women-also-qualify-for-world-cup/67936"]]'::jsonb, 'published', false),
('hsl-2026', 'Super League 2026 under way in Abuja', 'Seven women’s clubs and Nigeria’s leading men’s teams meet at the Moshood Abiola National Stadium from 26 June to 5 July.', 'The 2026 Nigeria Hockey Super League is being played on the national hockey pitch of the Moshood Abiola National Stadium in Abuja from 26 June to 5 July.

Seven clubs are contesting the women’s title: defending champions Kada Queens, Plateau Queens, Delta Queens, Yobe Desert Queens, IGP Babes, South West and Edo Queens. Kada Stars defend the men’s title.

Delta Queens opened with a 5–0 win over Yobe Desert Queens and drew 1–1 with South West on Sunday 28 June. Their head coach, Ade Jacobs, said the target after last season’s third place is to reach the final.

Alongside the matches, a Level 1 and Level 2 coaching course and an umpiring seminar run from 29 June to 4 July.', array['Super League','Women']::text[], 'Super League', '2026-06-28'::date, null, '/img/hsl-2026-match-day-2.jpg', 'Super League 2026 Match Day 2 graphic with the six clubs playing that day', 'Graphic: Super League 2026', '50% 16%', null, '[]'::jsonb, '[["Peoples Gazette (NAN): Delta Queens","https://gazettengr.com/delta-queens-confident-team-will-reach-hockey-super-league-final/"],["Africasport: Super League returns to Abuja","https://www.africasport.net/article/others/hockey-super-league-returns-to-abuja-with-focus"]]'::jsonb, 'published', false),
('hsl-2025-finals', 'Kada Stars and Kada Queens keep their Super League titles', 'Kada Stars beat Police Machine on a shoot-out after a goalless final; Kada Queens beat Plateau Queens 2–0.', 'The 2025 National Hockey Super League brought 23 men’s and women’s teams to the Moshood Abiola National Stadium in Abuja from 1 to 9 November 2025.

In the men’s final, defending champions Kada Stars and Police Machine drew 0–0, and Kada Stars won the shoot-out 3–2. In the women’s final, Kada Queens beat Plateau Queens 2–0. Delta Queens took third place, beating Yobe Queens 4–1 in a shoot-out.

The four finalists, Kada Stars, Kada Queens, Police Machine and Plateau Queens, earned places at the Africa Cup for Club Champions in Harare, Zimbabwe, in January 2026.', array['Super League']::text[], 'Super League', '2025-11-09'::date, null, null, null, null, '50% 50%', null, '[]'::jsonb, '[["BSN Sports report","https://bsnsports.com.ng/post/Kada-Stars--Kada-Queens-Retain-Titles-at-2025-National-Hockey-Super-League"]]'::jsonb, 'published', false),
('acn-2025-bronze', 'Men take Africa Cup of Nations bronze for the second edition running', 'A 3–1 win over Kenya in Ismailia repeats the bronze won in Accra in 2022. The women finished fourth.', 'Nigeria’s men beat Kenya 3–1 in the third-place match of the 2025 Hockey Africa Cup of Nations in Ismailia, Egypt, on 18 October. It is their second podium in a row, after bronze in Accra in 2022.

In the pool stage the men beat Ghana 2–1 and Zambia 5–1, and lost to Egypt, Kenya and South Africa.

The women finished fourth. They beat Egypt 2–0 in the pool and lost the bronze-medal match 0–1 to Kenya.', array['Senior men']::text[], 'Senior men', '2025-10-18'::date, null, null, null, null, '50% 50%', null, '[]'::jsonb, '[["Men’s tournament record","https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"],["Women’s tournament record","https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"],["FIH ranking log, men","https://www.fih.hockey/outdoor-rankings/nigeria-men-hockey-rankings-49"]]'::jsonb, 'published', false),
('african-games-medals', 'Silver for the women and bronze for the men at the African Games', 'Both senior teams reached the podium in Accra, the women matching their silver from Abuja in 2003.', 'At the 2023 African Games, played in Accra in March 2024, Nigeria’s women won silver and the men won bronze.

The women matched the silver they won on home soil in Abuja in 2003. For the men it was a first African Games medal since bronze in Nairobi in 1987.', array['Senior teams']::text[], 'Senior', '2024-03-01'::date, 'March 2024', null, null, null, '50% 50%', null, '[]'::jsonb, '[["Women’s team record","https://en.wikipedia.org/wiki/Nigeria_women%27s_national_field_hockey_team"],["Men’s team record","https://en.wikipedia.org/wiki/Nigeria_men%27s_national_field_hockey_team"]]'::jsonb, 'published', false)
on conflict (slug) do nothing;
commit;
