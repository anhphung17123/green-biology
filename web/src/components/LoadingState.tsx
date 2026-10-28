export default function LoadingState({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return <div className="data-loading" role="status"><span aria-hidden="true" />{label}</div>;
}
