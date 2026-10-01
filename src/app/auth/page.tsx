"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

const images = [
  "/auth/Rosel-1.png",
  "/auth/Rosel-3.png",
  "/auth/Rosel-4.png",
  "/auth/Rosel-4.png",
];

const prompts = [
  "Новый сервис от нашей компании, теперь головная боль с поиском поставщиков -  в прошлом.",
  "Теперь, с поиском поставщиков вам может помочь ваш личный ассистент - Russel AI - наша легкая ИИ модель",
  "Анализировать всех контрагентов теперь можно напрямую у нас",
  "Новый сервис от нашей компании, теперь головная боль с поиском поставщиков -  в прошлом.",
];

const formFields = [
  { label: "First Name", value: "Имя", type: "text" },
  { label: "Last Name", value: "Фамилия", type: "text" },
];

const termsText = (
  <>
    Создавая аккаунт, я принимаю{" "}
    <a href="#" className="font-medium underline underline-offset-2 text-white/45">
      Условия использования
    </a>{" "}
    и{" "}
    <a href="#" className="font-medium underline underline-offset-2 text-white/45">
      Политику конфиденциальности
    </a>
  </>
);

export default function AuthSectionTwo() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen p-3  antialiased [font-synthesis:none] bg-[#050505] text-white">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="flex min-h-[760px] justify-center overflow-hidden rounded-md bg-black px-7 py-12 text-white sm:px-10 lg:min-h-0 lg:py-20 xl:py-24">
          <div className="flex w-full max-w-[500px] flex-col items-center">
            <div className="flex items-center gap-3 text-lg text-white">
              <a className="flex gap-2 text-lg text-white items-center" href="/">
              <Roseltorg className="size-6" />
              Росэлторг
              </a>
            </div>

            <div className="relative mt-8 grid w-full grid-cols-[1.55fr_1fr] gap-2 rounded-md">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-black to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black to-transparent" />
              <ImageTile src={images[0]} active={activeIndex === 0} className="row-span-2 h-[250px]" />
              <ImageTile src={images[1]} active={activeIndex === 1} className="h-[121px]" />
              <ImageTile src={images[3]} active={activeIndex === 3} className="h-[121px]" />
              <ImageTile src={images[2]} active={activeIndex === 2} className="col-span-2 h-[120px]" />
            </div>

            <div className="mt-6 w-full rounded-[10px] border border-dashed border-white/15 px-5 py-4">
              <div className="flex items-end gap-4">
                <p className="line-clamp-4 flex-1 text-xs leading-4 text-white/45">
                  <span className="font-semibold text-white">Это интересно:</span> {prompts[activeIndex]}
                </p>
                <button className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>

            <p className="mt-7 max-w-[280px] text-center text-xl leading-tight text-white">
              Место встречи дистрибьюторов и заказчиков.
            </p>

            <div className="mt-auto flex gap-2 pb-8 pt-8">
              {prompts.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={activeIndex === index ? "h-1 w-10 rounded-full bg-white" : "h-1 w-4 rounded-full bg-white/35"}
                  aria-label={`Show prompt ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-[760px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <AuthForm />
        </div>
      </div>
    </section>
  );
}

function ImageTile({ src, active, className }: { src: string; active: boolean; className: string }) {
  return (
    <div className={`${className} relative overflow-visible rounded-md ${active ? "z-10" : "z-0"}`}>
      <img
        src={src}
        alt="Росэлторг"
        className={`h-full w-full rounded-md object-cover transition-opacity duration-700 ${active ? "opacity-100" : "opacity-40"}`}
      />
      <FocusCorners active={active} />
    </div>
  );
}

function FocusCorners({ active }: { active: boolean }) {
  const baseClass = `pointer-events-none absolute h-4 w-4 border-white/60 transition-all duration-500 ease-out ${active ? "translate-x-0 translate-y-0 opacity-100" : "opacity-0"}`;

  return (
    <>
      <div className={`${baseClass} -left-2 -top-2 border-l border-t ${active ? "" : "-translate-x-2 -translate-y-2"}`} />
      <div className={`${baseClass} -right-2 -top-2 border-r border-t ${active ? "" : "translate-x-2 -translate-y-2"}`} />
      <div className={`${baseClass} -bottom-2 -left-2 border-b border-l ${active ? "" : "-translate-x-2 translate-y-2"}`} />
      <div className={`${baseClass} -bottom-2 -right-2 border-b border-r ${active ? "" : "translate-x-2 translate-y-2"}`} />
    </>
  );
}

function AuthForm() {
  return (
    <div className="mx-auto w-full max-w-[500px] text-center">
      <h1 className="whitespace-nowrap text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05]">
        Добро пожаловать!
      </h1>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <SocialButton icon={<Gosuslugi />} label="Войти через Госуслуги" />
        <SocialButton icon={<YandexIcon />} label="Войти через Yandex ID" />
      </div>

      <div className="my-8 flex items-center gap-4 text-sm text-white/50">
        <div className="h-px flex-1 bg-white/15" />
        или
        <div className="h-px flex-1 bg-white/15" />
      </div>

      <form className="space-y-5 text-left">
        <div className="grid gap-5 sm:grid-cols-2">
          {formFields.map((field) => (
            <FieldBox key={field.label} label={field.label} value={field.value} type={field.type} />
          ))}
        </div>

        <FieldBox label="Почта" value="Введите почту" type="email" />
        <FieldBox label="Пароль" value="*************" type="password" />

        <div className="space-y-3 pt-2 text-xs leading-4 text-white/35 sm:text-[13px]">
          <CheckboxLine>Я согласен принимать электронные письма с новостями и предложениями компании Росэторг</CheckboxLine>
          <CheckboxLine>{termsText}</CheckboxLine>
        </div>

          <a href="/dashboard">
        <button
          type="button"
          className="mt-9 flex h-12 w-full items-center justify-center rounded-[10px] border text-lg font-medium transition-colors border-white/40 bg-white text-black hover:bg-white/85"
        >
          Принять
        </button>
        </a>
      </form>
    </div>
  );
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-9 items-center justify-center gap-2 rounded-[8px] border px-3 text-sm leading-none transition-colors border-white/20 bg-white/5 text-white hover:bg-white/10"
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function FieldBox({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  const [inputValue, setInputValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <label className="flex h-11 items-center justify-between gap-4 rounded-[8px] border px-4 text-base leading-none border-white/15 bg-white/5">
      <input
        type={type}
        value={inputValue}
        aria-label={label}
        onFocus={() => {
          if (!isEditing) {
            setInputValue("");
            setIsEditing(true);
          }
        }}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsEditing(true);
        }}
        className="min-w-0 flex-1 truncate bg-transparent outline-none text-white/35 placeholder:text-white/35"
      />
      {!isEditing && <span className="shrink-0 text-black dark:text-white">{label}</span>}
    </label>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <span className="relative mt-0.5 size-3 shrink-0">
        <input
          type="checkbox"
          className="peer size-full appearance-none rounded-[2px] border border-white/30 bg-white/5 checked:border-white checked:bg-white"
        />
        <svg viewBox="0 0 12 12" className="pointer-events-none absolute inset-0 hidden size-full p-px text-white peer-checked:block dark:text-black" fill="none" aria-hidden="true">
          <path d="M3 6.2 5 8.1 9 3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

function Roseltorg({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.41 17.5901H0C0.0979373 18.6349 0.302331 19.6669 0.61 20.6701H9.15L3.59 26.2301C4.23986 27.0297 4.97039 27.7603 5.77 28.4101L11.33 22.8501V31.3901C12.3332 31.6978 13.3652 31.9022 14.41 32.0001V17.5901ZM31.91 17.5901H17.5V32.0001C18.5448 31.9022 19.5768 31.6978 20.58 31.3901V20.6701H28C27.3941 22.2353 26.4908 23.6684 25.34 24.8901V29.0001C28.1654 26.9442 30.2437 24.0233 31.26 20.6801V20.6201C31.32 20.4301 31.37 20.2301 31.42 20.0301C31.4234 19.9768 31.4234 19.9234 31.42 19.8701C31.48 19.6501 31.52 19.4401 31.57 19.2301V19.0501C31.57 18.8701 31.64 18.6901 31.67 18.5001C31.6657 18.4469 31.6657 18.3934 31.67 18.3401C31.67 18.1701 31.72 18.0001 31.74 17.8301C31.7894 17.7452 31.8463 17.6649 31.91 17.5901ZM16 0.000121188C11.9899 -0.0154779 8.12014 1.47533 5.15699 4.17736C2.19384 6.87938 0.353363 10.5956 0 14.5901H10.9L12.62 11.5201H3.83C4.09826 10.7814 4.43296 10.0684 4.83 9.39012H13.83L15.55 6.31012H7.41C9.7691 4.22706 12.8079 3.07747 15.955 3.07747C19.1021 3.07747 22.1409 4.22706 24.5 6.31012H16.38L18.1 9.39012H27.1C27.4967 10.0686 27.8314 10.7815 28.1 11.5201H19.3L21 14.5901H31.9C31.5481 10.6128 29.7219 6.91074 26.7799 4.21115C23.8379 1.51156 19.9929 0.00954304 16 0.000121188Z" fill="white"/>
</svg>

  );
}

function Gosuslugi() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.9197 8.26555H12.4884C12.4815 8.26604 12.4749 8.26903 12.4699 8.27398C12.465 8.27894 12.462 8.28552 12.4615 8.29251V9.66069C12.3673 9.68764 12.2728 9.70112 12.1652 9.70112C11.8822 9.70112 11.8148 9.6136 11.8148 9.23612V8.29251C11.8143 8.28552 11.8113 8.27894 11.8064 8.27398C11.8014 8.26903 11.7948 8.26604 11.7879 8.26555H11.357C11.35 8.26604 11.3434 8.26903 11.3384 8.27398C11.3335 8.27894 11.3305 8.28552 11.33 8.29251V9.28337C11.33 9.90325 11.5388 10.1393 12.0709 10.1393C12.374 10.1393 12.7175 10.0585 12.9197 9.98427C12.9263 9.97745 12.933 9.97079 12.933 9.96397V8.29266C12.9465 8.27919 12.933 8.26571 12.9197 8.26571V8.26555ZM3.78581 8.27237H3.34792C3.33445 8.27237 3.32779 8.27903 3.32779 8.29251C3.26041 8.56202 3.119 9.02035 2.93034 9.49898L2.49261 8.28585C2.48579 8.27903 2.47914 8.27237 2.47232 8.27237H2.02778C2.02096 8.27237 2.0143 8.27903 2.00748 8.28585C2.00083 8.29251 2.00083 8.29932 2.00748 8.30598L2.66764 10.1124C2.60901 10.2358 2.54609 10.3572 2.47898 10.4762C2.43189 10.5571 2.39146 10.6379 2.35104 10.7256C2.34438 10.7324 2.34438 10.7391 2.35104 10.7459C2.35785 10.7525 2.36451 10.7594 2.37133 10.7594H2.84948C2.8563 10.7594 2.86977 10.7525 2.86977 10.7459C2.9692 10.5517 3.06132 10.3539 3.14595 10.1528C3.42878 9.49216 3.65105 8.87212 3.81958 8.30598C3.81958 8.29932 3.81958 8.29251 3.81276 8.28585C3.79928 8.27237 3.79262 8.27237 3.78581 8.27237ZM5.35533 9.66069C5.35511 9.65719 5.35362 9.65389 5.35114 9.65141C5.34866 9.64893 5.34536 9.64744 5.34186 9.64721H5.32157C5.21376 9.68764 5.01844 9.71459 4.88368 9.71459C4.58072 9.71459 4.43914 9.63374 4.43914 9.17556C4.43914 8.80474 4.48639 8.63622 4.88368 8.63622C4.99831 8.63622 5.0993 8.64969 5.23405 8.69012C5.24753 8.69012 5.25419 8.69012 5.261 8.67664L5.43603 8.32627V8.30598C5.43581 8.30248 5.43431 8.29918 5.43183 8.2967C5.42935 8.29422 5.42606 8.29273 5.42255 8.29251C5.23689 8.23609 5.04411 8.20656 4.85007 8.20483C4.22369 8.20483 3.9407 8.50146 3.9407 9.16875C3.9407 9.84269 4.22369 10.146 4.85007 10.146C5.00497 10.146 5.32157 10.1124 5.4698 10.0516C5.48327 10.0448 5.48993 10.0314 5.48327 10.0179L5.35533 9.66069ZM9.45735 8.27237H9.01963C9.00615 8.27237 8.99933 8.27903 8.99933 8.29251C8.93195 8.56884 8.79054 9.02035 8.60188 9.49898L8.16415 8.28585C8.15734 8.27903 8.15068 8.27237 8.14386 8.27237H7.69932C7.69266 8.27237 7.68585 8.27903 7.67919 8.28585C7.67237 8.29251 7.67237 8.29932 7.67919 8.30598L8.33918 10.1124C8.28055 10.2358 8.21763 10.3572 8.15052 10.4762C8.10343 10.5571 8.06301 10.6379 8.02258 10.7256C8.01592 10.7324 8.01592 10.7391 8.02258 10.7459C8.0294 10.7525 8.03606 10.7594 8.04287 10.7594H8.52102C8.52784 10.7594 8.54132 10.7525 8.54132 10.7459C8.64075 10.5517 8.73287 10.3539 8.81749 10.1528C9.09366 9.49216 9.32259 8.87212 9.49112 8.30598C9.49112 8.29932 9.49112 8.29251 9.4843 8.28585C9.47083 8.27237 9.46417 8.27237 9.45735 8.27237ZM11.074 8.26555H9.8009C9.79391 8.26604 9.78733 8.26903 9.78238 8.27398C9.77743 8.27894 9.77443 8.28552 9.77395 8.29251V10.0651C9.77395 10.0786 9.78743 10.0921 9.8009 10.0921H10.2321C10.2454 10.0921 10.2591 10.0786 10.2591 10.0651V8.69012H10.9257C10.9325 8.69012 10.946 8.68346 10.946 8.67664C10.9999 8.55536 11.047 8.42726 11.1009 8.29932V8.27903C11.0874 8.27237 11.0808 8.26555 11.074 8.26555Z" fill="#FF1743"/>
<path d="M4.2969 5.54258C3.67717 5.54258 3.43477 5.8121 3.43477 6.49286C3.43477 7.1871 3.67733 7.45677 4.2969 7.45677C4.92328 7.45677 5.16569 7.1871 5.16569 6.49286C5.16569 5.8121 4.92328 5.54258 4.2969 5.54258ZM4.2969 7.06582C4.01407 7.06582 3.9264 6.99162 3.9264 6.50634C3.9264 5.99426 4.02073 5.94701 4.2969 5.94701C4.57989 5.94701 4.67422 5.9941 4.67422 6.50634C4.67422 6.98496 4.58655 7.06582 4.2969 7.06582ZM6.89027 6.99162C6.89004 6.98812 6.88855 6.98482 6.88607 6.98234C6.88359 6.97986 6.88029 6.97837 6.87679 6.97815H6.8565C6.74869 7.01857 6.55337 7.04553 6.41877 7.04553C6.11565 7.04553 5.97407 6.96467 5.97407 6.5065C5.97407 6.13552 6.0145 5.96715 6.41877 5.96715C6.53324 5.96715 6.63439 5.98062 6.76898 6.02105C6.78246 6.02105 6.78912 6.02105 6.79594 6.00758L6.97096 5.65721V5.63691C6.97074 5.63341 6.96925 5.63011 6.96677 5.62763C6.96429 5.62515 6.96099 5.62366 6.95749 5.62344C6.77188 5.56703 6.57915 5.53751 6.38516 5.53577C5.75862 5.53577 5.47563 5.83223 5.47563 6.49968C5.47563 7.17347 5.75862 7.47691 6.38501 7.47691C6.5399 7.47691 6.8565 7.44314 7.00473 7.38258C7.01821 7.37576 7.02487 7.36228 7.01821 7.34881L6.89027 6.99162ZM2.02695 5.59649C2.01996 5.59697 2.01338 5.59996 2.00843 5.60492C2.00348 5.60987 2.00048 5.61645 2 5.62344V7.39589C2 7.40953 2.01348 7.42285 2.02695 7.42285H2.45818C2.47149 7.42285 2.48513 7.40953 2.48513 7.39589V6.02105H3.15178C3.1586 6.02105 3.17207 6.01439 3.17207 6.00758C3.22598 5.88629 3.27306 5.7582 3.32696 5.63026V5.60996C3.32015 5.60315 3.31349 5.59649 3.30667 5.59649H2.02695Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.9326 9.9035V9.87655C14.9326 9.86307 14.9326 9.84278 14.9394 9.82931C14.9596 9.57992 14.973 9.27664 14.9865 8.92611V8.89916L15 8.14436C15 7.88151 14.9933 7.62531 14.9865 7.3894V7.36245L14.9394 6.45942C14.9394 6.44578 14.9394 6.42565 14.9326 6.41217V6.38522C14.9326 6.35827 14.926 6.33798 14.926 6.31103V6.28408C14.9057 6.02122 14.8922 5.85951 14.8855 5.84603C14.8855 5.81908 14.8787 5.79213 14.8787 5.77184V5.7517C14.873 5.7062 14.864 5.66116 14.8518 5.61695C14.8518 5.61013 14.8518 5.60331 14.8451 5.59665C14.7306 5.05065 14.4275 4.4509 14.0502 3.99922C13.9021 3.82404 13.7471 3.66899 13.5855 3.54771C12.977 3.09899 12.3451 2.68278 11.6926 2.30081C10.7025 1.71437 9.81342 1.30994 9.69896 1.25604C9.69214 1.25604 9.69214 1.24938 9.69214 1.24938C9.42944 1.13476 9.11284 1.0539 8.76945 1.02029C8.70207 1.01348 8.63469 1.00682 8.56731 1.00682C8.50659 1.00682 8.44603 1 8.38547 1H8.29114C7.82631 1.00682 7.40206 1.09433 7.06517 1.24938C7.01126 1.26967 6.11552 1.6806 5.09834 2.27385L5.05791 2.29399C4.40797 2.68246 3.77637 3.10081 3.16513 3.54771C2.90925 3.73637 2.68016 3.97893 2.47137 4.28903C2.42428 4.36323 2.42428 4.53841 2.62626 4.53841H3.14499C3.36726 4.53841 3.42117 4.40365 3.67039 4.22165C3.94656 4.01952 4.49209 3.61509 5.48898 3.022C6.20969 2.59743 6.88332 2.26704 7.20658 2.11199C7.2134 2.11199 7.22006 2.10533 7.22687 2.10533C7.22687 2.10533 7.23353 2.10533 7.23353 2.09867C7.23353 2.09867 7.24035 2.09867 7.24035 2.09185C7.24701 2.09185 7.25383 2.08519 7.25383 2.08519C7.26048 2.08519 7.2673 2.07838 7.27396 2.07838C7.35481 2.03795 7.40872 2.01766 7.40872 2.01766C7.63781 1.91667 7.96106 1.84929 8.30446 1.84247H8.43922C8.54036 1.84247 8.64135 1.84929 8.73568 1.86276C8.94448 1.88972 9.13314 1.93014 9.28803 1.99752C9.3015 2.00418 9.32164 2.011 9.33511 2.01766C9.99304 2.32377 10.636 2.66115 11.2617 3.02865C11.8875 3.39795 12.4945 3.79839 13.0803 4.22847C13.2082 4.3228 13.3363 4.45756 13.4576 4.60579C13.7605 4.99675 14.0098 5.52928 14.0502 5.94036C14.0502 5.94718 14.0705 6.10889 14.0906 6.38522C14.0906 6.40536 14.0906 6.41883 14.0974 6.43913V6.47955C14.0974 6.5065 14.1041 6.5268 14.1041 6.55375V6.5807C14.1041 6.59418 14.1041 6.61431 14.1109 6.62779C14.1109 6.66155 14.1176 6.69517 14.1176 6.72893C14.1176 6.74923 14.1176 6.76936 14.1244 6.78965V6.80313C14.1244 6.83008 14.1244 6.85021 14.1311 6.87717V6.93107C14.1766 7.73486 14.1766 8.54023 14.1311 9.34402V9.39792C14.1311 9.42487 14.1311 9.44517 14.1244 9.47212V9.48559C14.1244 9.50573 14.1244 9.52602 14.1176 9.54616C14.1176 9.57992 14.1109 9.61369 14.1109 9.6473C14.1109 9.6676 14.1109 9.68107 14.1041 9.69455V9.7215C14.1041 9.74845 14.0974 9.76858 14.0974 9.79554V9.83612C14.0974 9.85626 14.0974 9.87655 14.0906 9.89003C14.0705 10.1664 14.0502 10.3347 14.0502 10.3347C14.0098 10.746 13.7605 11.2783 13.4574 11.6693C13.3363 11.8243 13.2082 11.9524 13.0803 12.0466C13.0736 12.0466 12.8984 12.1815 12.6088 12.3837C11.5821 13.096 10.4958 13.7184 9.36207 14.244L9.33511 14.2574C9.32164 14.2643 9.3015 14.2709 9.28803 14.2777C9.13314 14.3383 8.94448 14.3855 8.73568 14.4125C8.64135 14.426 8.54036 14.4326 8.43922 14.4326H8.30446C7.96106 14.426 7.63781 14.3652 7.40872 14.2574C7.40872 14.2574 7.36163 14.2373 7.27396 14.1967C7.2673 14.1901 7.25383 14.1901 7.24701 14.1832C7.24035 14.1766 7.23353 14.1766 7.22687 14.1698C7.22006 14.1698 7.22006 14.1631 7.2134 14.1631C7.20658 14.1631 7.19992 14.1563 7.19326 14.1563C7.18645 14.1496 7.17979 14.1496 7.16631 14.1428H7.1595C6.58779 13.8707 6.02816 13.5739 5.48216 13.2533C4.47862 12.6668 3.93975 12.2557 3.66373 12.0534C3.41435 11.8714 3.36045 11.7367 3.13818 11.7367H2.62626C2.42428 11.7367 2.42428 11.912 2.47137 11.9792C2.68016 12.2895 2.90925 12.5321 3.16513 12.7207C3.1989 12.7477 4.0206 13.3542 5.05807 13.9676C5.11182 14.0014 5.16572 14.035 5.22628 14.062C6.18956 14.6146 7.01808 14.9921 7.06532 15.0191C7.39524 15.1673 7.82631 15.255 8.28448 15.2684H8.37865C8.43937 15.2684 8.49994 15.2684 8.5605 15.2616C8.62788 15.2616 8.69525 15.255 8.76263 15.2481C9.10619 15.2145 9.42944 15.1337 9.68533 15.0191C9.68533 15.0191 9.69214 15.0191 9.69214 15.0124C9.80661 14.9585 10.6957 14.5472 11.6859 13.9676C12.1605 13.6867 12.6255 13.3899 13.0803 13.0779L13.5787 12.7207C13.7404 12.5994 13.8953 12.4444 14.0435 12.2692C14.4209 11.8175 14.7238 11.2178 14.8383 10.6718C14.8383 10.6651 14.8383 10.6583 14.8451 10.6516C14.8518 10.6044 14.8652 10.5572 14.8721 10.5169V10.4964C14.8787 10.4695 14.8787 10.4425 14.8787 10.4222C14.8787 10.4088 14.899 10.2471 14.9191 9.9842V9.95725C14.9326 9.95043 14.9326 9.92364 14.9326 9.9035Z" fill="url(#paint0_linear_2002_2)"/>
<path d="M7.33432 8.26575H6.01401C6.00054 8.26575 5.99388 8.27256 5.98706 8.28604C5.95345 8.88579 5.83899 9.52613 5.67728 10.0518C5.67728 10.0585 5.67728 10.0653 5.68394 10.072C5.69075 10.0788 5.69741 10.0788 5.70423 10.0788H6.15559C6.1689 10.0788 6.17572 10.072 6.17572 10.0653C6.30366 9.66104 6.40481 9.13517 6.44524 8.69031H6.8763V10.0585C6.8763 10.072 6.88978 10.0854 6.90325 10.0854H7.33432C7.34779 10.0854 7.36127 10.072 7.36127 10.0585V8.28604C7.36127 8.27922 7.34779 8.26575 7.33432 8.26575Z" fill="#EF3054"/>
<defs>
<linearGradient id="paint0_linear_2002_2" x1="8.65848" y1="1" x2="8.65848" y2="15.2684" gradientUnits="userSpaceOnUse">
<stop offset="0.4" stop-color="white"/>
<stop offset="0.66" stop-color="#FF1743"/>
</linearGradient>
</defs>
</svg>



  );
}

function YandexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="16" height="16" rx="8" fill="#FC3F1D"/>
<path d="M10.3643 12.0364H8.95398V5.05583H8.32423C7.17115 5.05583 6.568 5.63237 6.568 6.49274C6.568 7.46842 6.98488 7.92078 7.84526 8.49732L8.55484 8.97629L6.51478 12.0364H4.99805L6.8341 9.30447C5.77859 8.55054 5.18431 7.81434 5.18431 6.57257C5.18431 5.02035 6.26643 3.96484 8.31536 3.96484H10.3554V12.0364H10.3643Z" fill="white"/>
</svg>

  );
}
