import PropTypes from 'prop-types'
import styles from '../Dashboard.module.css'

export const Icon = ({ children, className = '' }) => (
  <svg className={`${styles.icon} ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)
Icon.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}
export const DashboardIcon = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Icon>
)
export const BillIcon = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="14" />
    <path d="M8 9h8M8 13h5" />
  </Icon>
)
export const WalletIcon = () => (
  <Icon>
    <path d="M4 7h16v12H4zM7 7V5h10v2M8 12h8" />
  </Icon>
)
export const BellIcon = () => (
  <Icon>
    <path d="M12 3a8 8 0 0 0-8 8v5l-2 2h20l-2-2v-5a8 8 0 0 0-8-8Z" />
    <path d="M9 21h6" />
  </Icon>
)
