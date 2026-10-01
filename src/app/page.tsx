import { GrainGradient } from "@paper-design/shaders-react";
import { ServicesStack } from "@/components/main/benefits/benefits";
import { Feature } from "@/components/main/features/features"
import Navbar from "@/components/main/Navbar";

export default function MainPage() {
  return (
    <>

      <section className="relative min-h-screen overflow-hidden">

        <div className="absolute inset-0 z-0">
          <GrainGradient
            width="100%"
            height="100%"
            colors={["#399ed0", "#a39c7500", "#0c4783"]}
            colorBack="#0e0d16"
            softness={0}
            intensity={0.15}
            noise={0.5}
            shape="blob"
            speed={1}
            scale={1.3}
          />
        </div>

        <Navbar
          navConfig={{
            brand: " Roseltorg",
            brandHref: "/",
            overlayBg: "#101014",
            clipOrigin: "left",
          }}
          navContent={{
            agencyName: "Roseltorg",
            tagline: "Сервис для поиска производителей",
            location: "Россия",
            links: [
              { label: "Главная", href: "/" },
              { label: "Вход", href: "/auth" },
              { label: "Блог", href: "/blog" },
              { label: "Контакты", href: "/contacts" },
            ],
          }}
        />

        
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          
        </div>
      </section>

      {/* Services */}
      <ServicesStack />

      <Feature />
      
      

    </>
  );
}