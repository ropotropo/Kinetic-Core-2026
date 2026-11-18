# Kinetic Core v0.5.5 - 280-second rehearsal

Sole game author: Mykyta Borisov.
Frozen source: `559a56eab08abfaca62001704c188be71e9f6dab`.

Technical notes are not slide copy. They retain assumptions and capture/source provenance.

## 1. Kinetic Core (15 s; 000-015 s)

Вітаю! Я Микита Борисов, автор Kinetic Core. Це моя гра з проєктування космічних місій для NASA Space Apps Challenge 2026.

- Approved generated portrait artwork reused unchanged. Image provenance remains in the presentation source records, not on the visible cover.

## 2. Один апарат. Кожен важливий момент. (20 s; 015-035 s)

Гра пов'язує проєктування апарата з рішеннями під час польоту. Я створюю її для допитливих людей, учнів, студентів і шанувальників космосу, які хочуть бачити наслідки інженерного вибору. На головному екрані в центрі цього досвіду перебуває Місяць.

- Audience is a design target, not a measured learning outcome. The slowly rotating home Moon is a decorative 3D illustration, not a dated ephemeris.

## 3. Головний екран місій (10 s; 035-045 s)

Звідси можна підготувати експедицію, повернутися до місії або відкрити доступні вправи й пояснення керування.

- Fresh frozen-v0.5.5 interface capture. Preserve the full screen and its current identity.
- Image: `assets/screens/01-missions-home.png`. Current mission home and 3D Moon.

## 4. Оберіть місію (14 s; 045-059 s)

Атлас допомагає свідомо обрати ціль. Для Місяця є пов'язана експедиція. Інші доступні світи пропонують чітко відокремлені локальні вправи з посадки.

- Do not imply every atlas body supports landing or a continuous Earth transfer. Sun and Earth include survey-only gates. Local rehearsal and integrated Moon expedition remain distinct.

## 5. Атлас світів (10 s; 059-069 s)

Можна роздивитися світ, прочитати його довідкові параметри та побачити, яка саме вправа доступна для обраної цілі.

- Keep the actual globe rail, body labels and landing gate visible. Source reference values are separate from illustrative terrain and fictional hardware.
- Image: `assets/screens/02-solar-atlas.png`. Current Solar System atlas.

## 6. Зберіть космічний апарат (20 s; 069-089 s)

Конструктор використовує сумісні точки кріплення. Гравець обирає обладнання та розміри. Ця сама конструкція визначає геометрію, стартову масу, запас пального й характеристики рушійної системи. Тому зміна має наслідки не лише для вигляду апарата.

- Typed design and dimension-dependent mass/fuel are implemented. Catalog hardware, tank densities and structural limits are fictional educational inputs. The ideal delta-v budget excludes gravity, drag and steering losses.

## 7. Зібраний апарат (18 s; 089-107 s)

Модель і розрахункові показники розташовані поруч. Можна оглянути компонент, змінити його та перейти зі збереженою конструкцією до планування місії, продовжуючи роботу з тим самим апаратом.

- Use an actual new-build workshop capture. Never substitute generated interface imagery or invented before/after values.
- Image: `assets/screens/05-workshop.png`. Current typed spacecraft workshop.

## 8. Старт. Маневр. Відокремлення. (18 s; 107-125 s)

Під час запуску модель застосовує тягу й витрачає пальне. Відокремлення прибирає масу відповідного обладнання та залишок його пального. Цю дію виконує пілот, а короткий рух камери допомагає побачити реальну подію.

- The capture must show a real validated stage release, not a renderer-only separation fixture. v0.5.5 inherits the 4.7-second stage camera beat; it does not replace the physical separation condition.

## 9. Відокремлення ступеня (15 s; 125-140 s)

У кадрі видно апарат і відокремлений ступінь. Положення та швидкість зберігаються, а маса апарата й доступні можливості рушійної системи змінюються.

- Record the exact current-build phase and capture preparation in the capture manifest. A staged phase capture is not itself proof of a new uninterrupted full mission run.
- Image: `assets/screens/17-manual-stage-release.png`. Actual manual stage separation after exact-solver checkpoint preparation and normal Restore/resume.

## 10. Від Землі до Місяця (20 s; 140-160 s)

Місячний маршрут зберігає апарат і спільний облік ресурсів під час запуску, виходу на орбіту, відльоту, пасивного перельоту, захоплення Місяцем і спуску. На пасивній ділянці двигун може бути вимкнений. Перехід між етапами залежить від фізичного стану та маневрів.

- Continuous route is an implemented model and has historical guided-playthrough evidence. These new media images may use exact-solver checkpoint preparation; do not call them a new uninterrupted player acceptance run. Route is 2D patched conics with a synthetic circular Moon and ideal pointing.

## 11. Наближення до Місяця й орбіта (18 s; 160-178 s)

Навігаційний вигляд і показники відображають стан апарата в моделі. Маневри з обмеженим запасом пального змінюють траєкторію, а облік ресурсів продовжується на місячних етапах.

- Use a current-build transfer, approach, capture or lunar-orbit image with its actual phase. Match the visible scene to the capture provenance; no live NASA telemetry or ephemeris accuracy is implied.
- Image: `assets/screens/25-lunar-orbit-active.png`. Active integrated lunar orbit after exact-solver checkpoint preparation and normal Restore/Resume; engine off and retained propellant.

## 12. Числа визначають політ (32 s; 178-210 s)

Модель використовує одиниці SI та обчислення подвійної точності. Рух визначають гравітація, витрата пального й змінна маса. Додатна витрата означає споживання пального, тому маса апарата зменшується. У наявному звіті QA для v0.5.5 зафіксовано сто п'ятдесят п'ять успішних перевірок. Це попередні результати, а не новий запуск тестів чи універсальний відсоток точності.

- Positive flow convention: mdot_prop = T/(Isp*g0) >= 0; d(m_vehicle)/dt = -mdot_prop during a burn, excluding discrete staging. g0 = 9.80665 m/s^2. Ideal delta-v excludes losses.
- Source: docs/PHYSICS.md model definitions and docs/QA-V055.md prior 155-test record. This media build does not rerun or certify them.
- Integrated route: 2D patched conics, synthetic circular Moon, ideal pointing. Separate local docking uses HCW/quaternion dynamics. No universal real-world accuracy, surveyed terrain, certification or NASA endorsement is asserted.

## 13. Спуск до Місяця з тягою (16 s; 210-226 s)

Під час спуску висота, вертикальна швидкість і відхилення від майданчика пояснюють наближення до поверхні. Активна допомога наведення використовує доступну тягу та обмежений запас пального.

- Use the genuine new-build descent/plume view. Identify integrated custom-craft versus local standard/custom rehearsal in its asset provenance. Camera/Sun/terrain are illustrative presentation, not new physics forces.
- Image: `assets/screens/21-descent-plume.png`. Integrated Moon final descent, exact-solver prepared entry followed by normal Restore/power/resume and actual modeled motion.

## 14. Посадка має умови (12 s; 226-238 s)

Успішна посадка потребує виконання умов контакту. Важливі швидкість, боковий рух, нахил, положення та обладнання. Візуальне прибуття не замінює цих умов.

- Contact limits are fictional educational thresholds. Never replace actual contact readings with post-constraint zero values. Do not introduce fabricated numerical results.

## 15. Посадка та прапор KC (12 s; 238-250 s)

Після справжнього результату посадки починається церемонія з прапором KC. Місія зберігає умови контакту та облік ресурсів.

- Use genuine current-build successful contact and the implemented visual flag finale. Crew/flag animation does not imply playable EVA controls, sampling, life-support, lunar ascent or Earth return.
- Image: `assets/screens/23-kc-flag.png`. KC flag ceremony following observed genuine physical contact in the restored continuous-solver prepared integrated craft; no landed-state checkpoint loaded.

## 16. Точність під час стикування (14 s; 250-264 s)

Стикування є окремою локальною тривимірною вправою. Гравець керує рухом та орієнтацією, стежить за приладами й використовує маневрові двигуни або активне гальмування з обмеженим запасом пального.

- Local HCW/quaternion scenario, not a complete long-range rendezvous or an automatic continuation of the Moon expedition. Powered assists consume RCS propellant.

## 17. Кабіна стикування (10 s; 264-274 s)

Кабіна й зовнішній вигляд показують той самий локальний стан. Невеликі корекції змінюють зближення та витрачають ресурси моделі.

- Use new-build actual docking footage/capture. A screenshot of approach does not establish successful soft capture. Cabin geometry is a fictional procedural reconstruction.
- Image: `assets/screens/11-docking-cockpit.png`. Current separate docking cockpit; manual RCS and powered attitude hold.

## 18. Дякую за увагу (6 s; 274-280 s)

Дякую за увагу. Я Микита Борисов, автор Kinetic Core.

- No public URL or additional author credit on the slide. Technical sources and capture provenance remain in source files.
