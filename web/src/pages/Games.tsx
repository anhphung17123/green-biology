import { ExternalLink, Search, Trees } from 'lucide-react';

const games = [
  {
    title: 'Khám phá môi trường sống',
    description: 'Kéo thả các sinh vật vào đúng môi trường sống của chúng.',
    href: 'https://share.gemini.google/mtzBY4NhrNBz',
    icon: Trees,
    theme: 'habitat',
  },
  {
    title: 'Thám tử rừng xanh',
    description: 'Quan sát bóng đen và lựa chọn đúng sinh vật đang ẩn mình.',
    href: 'https://share.gemini.google/hVMYUhpKReTE',
    icon: Search,
    theme: 'detective',
  },
] as const;

export default function Games() {
  return (
    <div className="page games-page">
      <div className="page-head">
        <div>
          <span className="kicker">TRÒ CHƠI TƯƠNG TÁC</span>
          <h1>Chơi để khám phá</h1>
          <p>Chọn một trò chơi và bắt đầu hành trình tìm hiểu thế giới sinh vật.</p>
        </div>
      </div>

      <div className="game-link-grid">
        {games.map(({ title, description, href, icon: Icon, theme }, index) => (
          <a
            className={`game-link-card ${theme}`}
            href={href}
            key={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${title} (mở trong tab mới)`}
          >
            <div className="game-link-number">Trò chơi {index + 1}</div>
            <div className="game-link-icon"><Icon aria-hidden="true" /></div>
            <div className="game-link-content">
              <h2>{title}</h2>
              <p>{description}</p>
              <span>Chơi ngay <ExternalLink size={17} aria-hidden="true" /></span>
            </div>
          </a>
        ))}
      </div>

      <p className="game-external-note">Trò chơi được mở trên Gemini trong một tab mới.</p>
    </div>
  );
}
